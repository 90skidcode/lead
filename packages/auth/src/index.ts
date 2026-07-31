import { hash, compare } from 'bcryptjs';
import { jwtVerify, SignJWT } from 'jose';

export interface Session {
  userId: string;
  userEmail: string;
  tenantId: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALES_REP' | 'VIEWER';
  isPlatformSuperAdmin: boolean;
  expiresAt: Date;
}

export interface ImpersonationContext {
  targetUserId: string;
  superAdminUserId: string;
  tenantId: string;
  reason: string;
  ipAddress?: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await compare(password, hash);
  } catch {
    return false;
  }
}

export function createSession(
  userId: string,
  email: string,
  tenantId: string,
  role: string,
  isPlatformSuperAdmin: boolean = false
): Session {
  return {
    userId,
    userEmail: email,
    tenantId,
    role: role as Session['role'],
    isPlatformSuperAdmin,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  };
}

export async function signSessionToken(session: Session, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret.padEnd(32, ' '));

  const jwt = new SignJWT({
    sub: session.userId,
    email: session.userEmail,
    tenant_id: session.tenantId,
    role: session.role,
    is_super_admin: session.isPlatformSuperAdmin,
  });

  jwt.setProtectedHeader({ alg: 'HS256' });
  jwt.setIssuedAt();
  jwt.setExpirationTime(Math.floor(session.expiresAt.getTime() / 1000));

  const token = await jwt.sign(secretKey);
  return token;
}

export async function verifySessionToken(token: string, secret: string): Promise<Session | null> {
  try {
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(secret.padEnd(32, ' '));

    const verified = await jwtVerify(token, secretKey);
    const payload = verified.payload;

    return {
      userId: payload.sub as string,
      userEmail: payload.email as string,
      tenantId: payload.tenant_id as string,
      role: payload.role as Session['role'],
      isPlatformSuperAdmin: (payload.is_super_admin as boolean) || false,
      expiresAt: new Date((payload.exp as number) * 1000),
    };
  } catch {
    // Token is invalid/expired; return null for caller to handle
    return null;
  }
}

export function validateSessionExpiry(session: Session): boolean {
  return session.expiresAt > new Date();
}

export function requireValidSession(session: Session | null): Session {
  if (!session) {
    throw new AuthError('Unauthorized: no session', 'NO_SESSION');
  }

  if (!validateSessionExpiry(session)) {
    throw new AuthError('Unauthorized: session expired', 'SESSION_EXPIRED');
  }

  return session;
}

export function requireSuperAdmin(session: Session | null): void {
  if (!session?.isPlatformSuperAdmin) {
    throw new AuthError('Forbidden: super admin access required', 'NOT_SUPER_ADMIN');
  }
}

export function requireTenantMembership(session: Session, requiredTenantId: string): void {
  if (session.tenantId !== requiredTenantId) {
    throw new AuthError('Forbidden: not a member of this tenant', 'TENANT_MISMATCH');
  }
}
