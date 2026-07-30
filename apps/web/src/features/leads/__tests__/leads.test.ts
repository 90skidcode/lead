import { describe, it, expect } from 'vitest';
import { createSession } from '@lead/auth';
import { hasPermission } from '@lead/permissions';

describe('Lead CRUD Permissions', () => {
  describe('lead:create permission', () => {
    it('should allow OWNER to create leads', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'OWNER');
      expect(hasPermission(session, 'lead:create')).toBe(true);
    });

    it('should allow ADMIN to create leads', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'ADMIN');
      expect(hasPermission(session, 'lead:create')).toBe(true);
    });

    it('should allow MANAGER to create leads', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'MANAGER');
      expect(hasPermission(session, 'lead:create')).toBe(true);
    });

    it('should allow SALES_REP to create leads', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'SALES_REP');
      expect(hasPermission(session, 'lead:create')).toBe(true);
    });

    it('should deny VIEWER from creating leads', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'VIEWER');
      expect(hasPermission(session, 'lead:create')).toBe(false);
    });
  });

  describe('lead:update:any permission', () => {
    it('should allow OWNER to update any lead', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'OWNER');
      expect(hasPermission(session, 'lead:update:any')).toBe(true);
    });

    it('should allow ADMIN to update any lead', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'ADMIN');
      expect(hasPermission(session, 'lead:update:any')).toBe(true);
    });

    it('should allow MANAGER to update team leads', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'MANAGER');
      expect(hasPermission(session, 'lead:update:any')).toBe(true);
    });

    it('should deny SALES_REP from updating any lead', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'SALES_REP');
      expect(hasPermission(session, 'lead:update:any')).toBe(false);
    });

    it('should deny VIEWER from updating leads', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'VIEWER');
      expect(hasPermission(session, 'lead:update:any')).toBe(false);
    });
  });

  describe('lead:delete permission', () => {
    it('should allow OWNER to delete leads', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'OWNER');
      expect(hasPermission(session, 'lead:delete')).toBe(true);
    });

    it('should allow ADMIN to delete leads', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'ADMIN');
      expect(hasPermission(session, 'lead:delete')).toBe(true);
    });

    it('should allow MANAGER to delete leads', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'MANAGER');
      expect(hasPermission(session, 'lead:delete')).toBe(true);
    });

    it('should allow SALES_REP to delete leads', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'SALES_REP');
      expect(hasPermission(session, 'lead:delete')).toBe(true);
    });

    it('should deny VIEWER from deleting leads', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'VIEWER');
      expect(hasPermission(session, 'lead:delete')).toBe(false);
    });
  });

  describe('lead:read:own permission', () => {
    it('should allow all roles to read own leads', () => {
      const roles = ['OWNER', 'ADMIN', 'MANAGER', 'SALES_REP', 'VIEWER'] as const;

      for (const role of roles) {
        const session = createSession('user-1', 'test@example.com', 'tenant-1', role);
        expect(hasPermission(session, 'lead:read:own')).toBe(true);
      }
    });
  });
});
