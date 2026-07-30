import type { Session } from '@lead/auth';

export type Permission =
  | 'lead:create'
  | 'lead:read:any'
  | 'lead:read:own'
  | 'lead:update:any'
  | 'lead:update:own'
  | 'lead:delete'
  | 'user:invite'
  | 'user:update_role'
  | 'pipeline:manage'
  | 'report:view_team'
  | 'report:view_all'
  | 'tenant:manage';

const rolePermissions: Record<string, Permission[]> = {
  OWNER: [
    'lead:create',
    'lead:read:any',
    'lead:read:own',
    'lead:update:any',
    'lead:update:own',
    'lead:delete',
    'user:invite',
    'user:update_role',
    'pipeline:manage',
    'report:view_team',
    'report:view_all',
    'tenant:manage',
  ],
  ADMIN: [
    'lead:create',
    'lead:read:any',
    'lead:read:own',
    'lead:update:any',
    'lead:update:own',
    'lead:delete',
    'user:invite',
    'user:update_role',
    'pipeline:manage',
    'report:view_team',
    'report:view_all',
    'tenant:manage',
  ],
  MANAGER: [
    'lead:create',
    'lead:read:any',
    'lead:read:own',
    'lead:update:any',
    'lead:update:own',
    'lead:delete',
    'report:view_team',
  ],
  SALES_REP: [
    'lead:create',
    'lead:read:own',
    'lead:update:own',
    'lead:delete',
  ],
  VIEWER: [
    'lead:read:any',
    'lead:read:own',
  ],
};

export function hasPermission(session: Session | null, permission: Permission): boolean {
  if (!session) return false;
  if (session.isPlatformSuperAdmin) return true;

  const permissions = rolePermissions[session.role] || [];
  return permissions.includes(permission);
}

export function requirePermission(session: Session | null, permission: Permission): void {
  if (!hasPermission(session, permission)) {
    throw new Error(`Unauthorized: missing permission ${permission}`);
  }
}

export function getPermissions(session: Session | null): Permission[] {
  if (!session) return [];
  if (session.isPlatformSuperAdmin) return Object.values(rolePermissions).flat();
  return rolePermissions[session.role] || [];
}
