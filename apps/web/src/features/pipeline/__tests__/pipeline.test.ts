import { describe, it, expect } from 'vitest';
import { createSession } from '@lead/auth';
import { hasPermission } from '@lead/permissions';

describe('Pipeline Management Permissions', () => {
  describe('pipeline:manage permission', () => {
    it('should allow OWNER to manage pipelines', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'OWNER');
      expect(hasPermission(session, 'pipeline:manage')).toBe(true);
    });

    it('should allow ADMIN to manage pipelines', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'ADMIN');
      expect(hasPermission(session, 'pipeline:manage')).toBe(true);
    });

    it('should deny MANAGER from managing pipelines', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'MANAGER');
      expect(hasPermission(session, 'pipeline:manage')).toBe(false);
    });

    it('should deny SALES_REP from managing pipelines', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'SALES_REP');
      expect(hasPermission(session, 'pipeline:manage')).toBe(false);
    });

    it('should deny VIEWER from managing pipelines', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'VIEWER');
      expect(hasPermission(session, 'pipeline:manage')).toBe(false);
    });
  });

  describe('report:view_team permission', () => {
    it('should allow OWNER to view team reports', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'OWNER');
      expect(hasPermission(session, 'report:view_team')).toBe(true);
    });

    it('should allow ADMIN to view team reports', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'ADMIN');
      expect(hasPermission(session, 'report:view_team')).toBe(true);
    });

    it('should allow MANAGER to view team reports', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'MANAGER');
      expect(hasPermission(session, 'report:view_team')).toBe(true);
    });

    it('should deny SALES_REP from viewing team reports', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'SALES_REP');
      expect(hasPermission(session, 'report:view_team')).toBe(false);
    });

    it('should deny VIEWER from viewing team reports', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'VIEWER');
      expect(hasPermission(session, 'report:view_team')).toBe(false);
    });
  });
});
