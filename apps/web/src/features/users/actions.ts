'use server';

import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '@lead/permissions';
import { getSessionFromHeaders } from '../auth/middleware';
import { inviteUserSchema } from '@lead/validation';

const db = new PrismaClient();

export async function inviteUser(formData: FormData) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'user:invite');

    const email = formData.get('email') as string;
    const role = formData.get('role') as string;
    const teamId = formData.get('teamId') as string | null;

    const validated = inviteUserSchema.parse({
      email,
      role,
      teamId: teamId || undefined,
    });

    // Check if user already exists and is a member
    const existingUser = await db.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      const existingMembership = await db.tenantUser.findUnique({
        where: {
          tenantId_userId: {
            tenantId: session.tenantId,
            userId: existingUser.id,
          },
        },
      });

      if (existingMembership && existingMembership.status === 'active') {
        throw new Error('User is already a member of this tenant');
      }
    }

    // Generate invitation token
    const token = crypto.getRandomValues(new Uint8Array(32)).toString();
    const tokenHash = Buffer.from(token).toString('base64');

    // Create invitation
    const invitation = await db.invitation.create({
      data: {
        tenantId: session.tenantId,
        email: validated.email,
        role: validated.role,
        teamId: validated.teamId,
        tokenHash,
        invitedBy: session.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Log invitation
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'user_invited',
        entityType: 'invitation',
        entityId: invitation.id,
        metadata: {
          email: validated.email,
          role: validated.role,
        },
      },
    });

    return {
      success: true,
      invitationId: invitation.id,
      inviteLink: `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${token}`,
    };
  } finally {
    await db.$disconnect();
  }
}

export async function listTenantUsers() {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const users = await db.tenantUser.findMany({
      where: { tenantId: session.tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
          },
        },
        team: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  } finally {
    await db.$disconnect();
  }
}

export async function updateUserRole(userId: string, newRole: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'user:update_role');

    // Cannot change self role
    if (userId === session.userId) {
      throw new Error('Cannot change your own role');
    }

    const membership = await db.tenantUser.update({
      where: {
        tenantId_userId: {
          tenantId: session.tenantId,
          userId,
        },
      },
      data: { role: newRole },
    });

    // Log role change
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'user_role_updated',
        entityType: 'tenant_user',
        entityId: membership.id,
        metadata: {
          userId,
          newRole,
        },
      },
    });

    return membership;
  } finally {
    await db.$disconnect();
  }
}

export async function removeUserFromTenant(userId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'user:update_role');

    // Cannot remove self
    if (userId === session.userId) {
      throw new Error('Cannot remove yourself');
    }

    // Deactivate membership instead of deleting
    const membership = await db.tenantUser.update({
      where: {
        tenantId_userId: {
          tenantId: session.tenantId,
          userId,
        },
      },
      data: {
        status: 'deactivated',
        deactivatedAt: new Date(),
      },
    });

    // Log removal
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'user_removed',
        entityType: 'tenant_user',
        entityId: membership.id,
        metadata: { userId },
      },
    });

    return membership;
  } finally {
    await db.$disconnect();
  }
}
