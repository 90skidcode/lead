'use server';

import { headers, cookies } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { requireSuperAdmin, createSession, signSessionToken } from '@lead/auth';
import { getSessionFromHeaders } from '../auth/middleware';

const db = new PrismaClient();
const SESSION_COOKIE_NAME = 'session_token';

export async function listTenants() {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requireSuperAdmin(session);

    const tenants = await db.tenant.findMany({
      include: {
        users: {
          where: { status: 'active' },
          select: {
            id: true,
            role: true,
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tenants;
  } finally {
    await db.$disconnect();
  }
}

export async function getTenant(tenantId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requireSuperAdmin(session);

    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          include: {
            user: { select: { id: true, email: true, createdAt: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    return tenant;
  } finally {
    await db.$disconnect();
  }
}

export async function suspendTenant(tenantId: string, reason: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requireSuperAdmin(session);

    const tenant = await db.tenant.update({
      where: { id: tenantId },
      data: { status: 'suspended' },
    });

    // Log suspension
    await db.auditLog.create({
      data: {
        tenantId: null, // Platform-level event
        actorUserId: session.userId,
        actorIsSuperAdmin: true,
        action: 'tenant_suspended',
        entityType: 'tenant',
        entityId: tenantId,
        metadata: { reason },
      },
    });

    return tenant;
  } finally {
    await db.$disconnect();
  }
}

export async function reactivateTenant(tenantId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requireSuperAdmin(session);

    const tenant = await db.tenant.update({
      where: { id: tenantId },
      data: { status: 'active' },
    });

    // Log reactivation
    await db.auditLog.create({
      data: {
        tenantId: null,
        actorUserId: session.userId,
        actorIsSuperAdmin: true,
        action: 'tenant_reactivated',
        entityType: 'tenant',
        entityId: tenantId,
      },
    });

    return tenant;
  } finally {
    await db.$disconnect();
  }
}

export async function startImpersonation(targetUserId: string, tenantId: string, reason: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requireSuperAdmin(session);

    // Get target user and verify membership
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      include: {
        tenants: {
          where: {
            tenantId,
            status: 'active',
          },
        },
      },
    });

    if (!targetUser || targetUser.tenants.length === 0) {
      throw new Error('Target user is not an active member of the tenant');
    }

    const membership = targetUser.tenants[0];

    // Create impersonation session
    const impersonationSession = await db.impersonationSession.create({
      data: {
        superAdminUserId: session.userId,
        targetUserId,
        tenantId,
        reason,
        ipAddress: headersList.get('x-forwarded-for') || 'unknown',
      },
    });

    // Create session as target user
    const impersonatedSession = createSession(
      targetUser.id,
      targetUser.email,
      tenantId,
      membership.role,
      false
    );

    const token = await signSessionToken(impersonatedSession, process.env.SESSION_SECRET!);

    // Update session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    // Log impersonation start
    await db.auditLog.create({
      data: {
        tenantId,
        actorUserId: session.userId,
        actorIsSuperAdmin: true,
        action: 'impersonation_started',
        entityType: 'impersonation_session',
        entityId: impersonationSession.id,
        metadata: { targetUserId, reason },
      },
    });

    return { success: true, impersonationSessionId: impersonationSession.id };
  } finally {
    await db.$disconnect();
  }
}

export async function endImpersonation() {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    // Find active impersonation session for this target user
    const impersonationSession = await db.impersonationSession.findFirst({
      where: {
        targetUserId: session.userId,
        endedAt: null,
      },
    });

    if (!impersonationSession) {
      throw new Error('No active impersonation session');
    }

    // End impersonation
    await db.impersonationSession.update({
      where: { id: impersonationSession.id },
      data: { endedAt: new Date() },
    });

    // Get super admin user
    const superAdmin = await db.user.findUnique({
      where: { id: impersonationSession.superAdminUserId },
    });

    if (!superAdmin) {
      throw new Error('Super admin user not found');
    }

    // Create session as super admin
    const superAdminSession = createSession(
      superAdmin.id,
      superAdmin.email,
      impersonationSession.tenantId,
      'OWNER',
      true
    );

    const token = await signSessionToken(superAdminSession, process.env.SESSION_SECRET!);

    // Update session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    // Log impersonation end
    await db.auditLog.create({
      data: {
        tenantId: null,
        actorUserId: superAdmin.id,
        actorIsSuperAdmin: true,
        action: 'impersonation_ended',
        entityType: 'impersonation_session',
        entityId: impersonationSession.id,
      },
    });

    return { success: true };
  } finally {
    await db.$disconnect();
  }
}
