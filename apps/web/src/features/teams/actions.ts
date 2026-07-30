'use server';

import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '@lead/permissions';
import { getSessionFromHeaders } from '../auth/middleware';

const db = new PrismaClient();

export async function createTeam(name: string, managerUserId?: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'tenant:manage');

    const team = await db.team.create({
      data: {
        tenantId: session.tenantId,
        name,
        managerUserId,
      },
    });

    // Log team creation
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'team_created',
        entityType: 'team',
        entityId: team.id,
        metadata: { name },
      },
    });

    return team;
  } finally {
    await db.$disconnect();
  }
}

export async function listTeams() {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const teams = await db.team.findMany({
      where: { tenantId: session.tenantId },
      include: {
        members: {
          where: { status: 'active' },
          select: {
            id: true,
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return teams;
  } finally {
    await db.$disconnect();
  }
}

export async function updateTeam(teamId: string, name?: string, managerUserId?: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'tenant:manage');

    const team = await db.team.update({
      where: { id: teamId },
      data: {
        ...(name && { name }),
        ...(managerUserId && { managerUserId }),
      },
    });

    // Log update
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'team_updated',
        entityType: 'team',
        entityId: team.id,
        metadata: { name, managerUserId },
      },
    });

    return team;
  } finally {
    await db.$disconnect();
  }
}

export async function deactivateTeam(teamId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'tenant:manage');

    const team = await db.team.update({
      where: { id: teamId },
      data: { status: 'inactive' },
    });

    // Log deactivation
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'team_deactivated',
        entityType: 'team',
        entityId: team.id,
      },
    });

    return team;
  } finally {
    await db.$disconnect();
  }
}

export async function addTeamMember(teamId: string, userId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'tenant:manage');

    // Verify user is a tenant member
    const tenantUser = await db.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId: session.tenantId,
          userId,
        },
      },
    });

    if (!tenantUser) {
      throw new Error('User is not a member of this tenant');
    }

    // Update team assignment
    const updated = await db.tenantUser.update({
      where: {
        tenantId_userId: {
          tenantId: session.tenantId,
          userId,
        },
      },
      data: { teamId },
    });

    // Log member addition
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'team_member_added',
        entityType: 'team',
        entityId: teamId,
        metadata: { userId },
      },
    });

    return updated;
  } finally {
    await db.$disconnect();
  }
}

export async function removeTeamMember(teamId: string, userId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'tenant:manage');

    const updated = await db.tenantUser.update({
      where: {
        tenantId_userId: {
          tenantId: session.tenantId,
          userId,
        },
      },
      data: { teamId: null },
    });

    // Log removal
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'team_member_removed',
        entityType: 'team',
        entityId: teamId,
        metadata: { userId },
      },
    });

    return updated;
  } finally {
    await db.$disconnect();
  }
}
