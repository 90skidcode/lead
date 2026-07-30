import { describe, it, expect } from 'vitest';
import { hasPermission, requirePermission, getPermissions } from '../index';
import { createSession } from '@lead/auth';

describe('Permissions Module', () => {
  describe('hasPermission', () => {
    it('should grant lead:create to OWNER', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'OWNER');
      expect(hasPermission(session, 'lead:create')).toBe(true);
    });

    it('should grant lead:create to ADMIN', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'ADMIN');
      expect(hasPermission(session, 'lead:create')).toBe(true);
    });

    it('should grant lead:create to MANAGER', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'MANAGER');
      expect(hasPermission(session, 'lead:create')).toBe(true);
    });

    it('should grant lead:create to SALES_REP', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'SALES_REP');
      expect(hasPermission(session, 'lead:create')).toBe(true);
    });

    it('should deny lead:create to VIEWER', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'VIEWER');
      expect(hasPermission(session, 'lead:create')).toBe(false);
    });

    it('should grant all permissions to super admin', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'VIEWER', true);
      expect(hasPermission(session, 'lead:create')).toBe(true);
      expect(hasPermission(session, 'tenant:manage')).toBe(true);
      expect(hasPermission(session, 'user:invite')).toBe(true);
    });

    it('should deny permission to null session', () => {
      expect(hasPermission(null, 'lead:create')).toBe(false);
    });
  });

  describe('requirePermission', () => {
    it('should not throw for valid permission', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'OWNER');
      expect(() => requirePermission(session, 'lead:create')).not.toThrow();
    });

    it('should throw for missing permission', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'VIEWER');
      expect(() => requirePermission(session, 'lead:create')).toThrow('Unauthorized');
    });

    it('should throw for null session', () => {
      expect(() => requirePermission(null, 'lead:create')).toThrow('Unauthorized');
    });
  });

  describe('getPermissions', () => {
    it('should return all permissions for OWNER', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'OWNER');
      const permissions = getPermissions(session);

      expect(permissions).toContain('lead:create');
      expect(permissions).toContain('lead:delete');
      expect(permissions).toContain('user:invite');
      expect(permissions).toContain('tenant:manage');
    });

    it('should return limited permissions for SALES_REP', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'SALES_REP');
      const permissions = getPermissions(session);

      expect(permissions).toContain('lead:create');
      expect(permissions).toContain('lead:read:own');
      expect(permissions).not.toContain('tenant:manage');
      expect(permissions).not.toContain('user:invite');
    });

    it('should return empty array for null session', () => {
      const permissions = getPermissions(null);
      expect(permissions).toEqual([]);
    });

    it('should return all permissions for super admin', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'VIEWER', true);
      const permissions = getPermissions(session);

      // Super admin should have all permissions
      expect(permissions.length).toBeGreaterThan(0);
      expect(permissions).toContain('lead:create');
      expect(permissions).toContain('tenant:manage');
    });
  });

  describe('Permission matrix', () => {
    it('should enforce OWNER > ADMIN > MANAGER > SALES_REP > VIEWER hierarchy', () => {
      const roles = ['OWNER', 'ADMIN', 'MANAGER', 'SALES_REP', 'VIEWER'] as const;
      const testPermission = 'lead:read:any';

      let previousCount = Infinity;
      for (const role of roles) {
        const session = createSession('user-1', 'test@example.com', 'tenant-1', role);
        const permissions = getPermissions(session);
        const hasPermission = permissions.includes(testPermission);

        // Each role should have <= permissions than previous
        expect(permissions.length).toBeLessThanOrEqual(previousCount);
        previousCount = permissions.length;

        if (role !== 'VIEWER') {
          expect(hasPermission).toBe(true);
        }
      }
    });
  });
});
