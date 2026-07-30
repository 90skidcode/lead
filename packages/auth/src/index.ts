export interface Session {
  userId: string;
  userEmail: string;
  tenantId: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALES_REP' | 'VIEWER';
  isPlatformSuperAdmin: boolean;
  expiresAt: Date;
}

export interface AuthContext {
  session: Session | null;
  error?: string;
}

export function createSession(userId: string, email: string, tenantId: string, role: string): Session {
  return {
    userId,
    userEmail: email,
    tenantId,
    role: role as Session['role'],
    isPlatformSuperAdmin: false,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
}
