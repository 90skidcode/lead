import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  createSession,
  signSessionToken,
  verifySessionToken,
  validateSessionExpiry,
  AuthError,
} from '@lead/auth';

describe('Auth Module', () => {
  describe('Password hashing', () => {
    it('should hash passwords', async () => {
      const password = 'test-password-123';
      const hash = await hashPassword(password);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
    });

    it('should verify correct password', async () => {
      const password = 'test-password-123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'test-password-123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('wrong-password', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('Session creation', () => {
    it('should create a session', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'OWNER');

      expect(session).toMatchObject({
        userId: 'user-1',
        userEmail: 'test@example.com',
        tenantId: 'tenant-1',
        role: 'OWNER',
        isPlatformSuperAdmin: false,
      });
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should set expiry to 24 hours', () => {
      const beforeCreate = Date.now();
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'OWNER');
      const afterCreate = Date.now();

      const expectedExpiry = beforeCreate + 24 * 60 * 60 * 1000;
      const timeDiff = Math.abs(session.expiresAt.getTime() - expectedExpiry);

      expect(timeDiff).toBeLessThan(1000); // Within 1 second
    });

    it('should mark super admins', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'OWNER', true);

      expect(session.isPlatformSuperAdmin).toBe(true);
    });
  });

  describe('Session token', () => {
    it('should sign and verify token', async () => {
      const secret = 'test-secret-min-32-chars-here-!';
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'OWNER');

      const token = await signSessionToken(session, secret);
      expect(token).toBeTruthy();

      const verified = await verifySessionToken(token, secret);
      expect(verified).toMatchObject({
        userId: session.userId,
        userEmail: session.userEmail,
        tenantId: session.tenantId,
        role: session.role,
      });
    });

    it('should reject invalid token', async () => {
      const secret = 'test-secret-min-32-chars-here-!';
      const verified = await verifySessionToken('invalid.token.here', secret);

      expect(verified).toBeNull();
    });

    it('should reject token with wrong secret', async () => {
      const secret = 'test-secret-min-32-chars-here-!';
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'OWNER');

      const token = await signSessionToken(session, secret);
      const verified = await verifySessionToken(token, 'different-secret-min-32-chars!!!');

      expect(verified).toBeNull();
    });
  });

  describe('Session validation', () => {
    it('should validate non-expired session', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'OWNER');
      const isValid = validateSessionExpiry(session);

      expect(isValid).toBe(true);
    });

    it('should reject expired session', () => {
      const session = createSession('user-1', 'test@example.com', 'tenant-1', 'OWNER');
      session.expiresAt = new Date(Date.now() - 1000); // 1 second ago

      const isValid = validateSessionExpiry(session);

      expect(isValid).toBe(false);
    });
  });

  describe('Auth errors', () => {
    it('should throw with code', () => {
      const error = new AuthError('Test error', 'TEST_ERROR');

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('AuthError');
    });
  });
});
