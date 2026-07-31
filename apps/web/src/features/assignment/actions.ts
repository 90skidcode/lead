'use server';

import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '@lead/permissions';
import { getSessionFromHeaders } from '../auth/middleware';

const db = new PrismaClient();

export async function assignLeadManual(leadId: string, userId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:update:any');

    // Verify assignee is active in tenant
    const tenantUser = await db.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId: session.tenantId,
          userId,
        },
      },
    });

    if (!tenantUser || tenantUser.status !== 'active') {
      throw new Error('User is not an active member of this tenant');
    }

    const lead = await db.lead.update({
      where: { id: leadId },
      data: { ownerUserId: userId },
    });

    // Log activity
    await db.activity.create({
      data: {
        tenantId: session.tenantId,
        leadId,
        type: 'assignment',
        actorUserId: session.userId,
        payload: { assignedTo: userId },
      },
    });

    // Create notification for assignee
    await db.notification.create({
      data: {
        tenantId: session.tenantId,
        userId,
        type: 'assignment',
        title: 'New Lead Assignment',
        body: `You have been assigned to lead: ${lead.name}`,
        leadId,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'lead_assigned',
        entityType: 'lead',
        entityId: lead.id,
        metadata: { assignedTo: userId },
      },
    });

    return lead;
  } finally {
    await db.$disconnect();
  }
}

export async function assignLeadRoundRobin(leadId: string, teamId?: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:update:any');

    // Get active members of the team (or tenant if no team)
    const query = teamId
      ? {
          tenantId: session.tenantId,
          teamId,
          status: 'active',
        }
      : {
          tenantId: session.tenantId,
          status: 'active',
        };

    const members = await db.tenantUser.findMany({
      where: query,
      select: { userId: true },
    });

    if (members.length === 0) {
      throw new Error('No active team members available');
    }

    // Find member with least assigned leads
    const memberStats = await Promise.all(
      members.map(async (member) => ({
        userId: member.userId,
        leadCount: await db.lead.count({
          where: {
            tenantId: session.tenantId,
            ownerUserId: member.userId,
            deletedAt: null,
          },
        }),
      }))
    );

    // Pick member with fewest leads
    const assignTo = memberStats.reduce((prev, current) =>
      prev.leadCount < current.leadCount ? prev : current
    );

    const lead = await db.lead.update({
      where: { id: leadId },
      data: { ownerUserId: assignTo.userId },
    });

    // Log activity
    await db.activity.create({
      data: {
        tenantId: session.tenantId,
        leadId,
        type: 'assignment',
        actorUserId: session.userId,
        payload: { strategy: 'round_robin', assignedTo: assignTo.userId },
      },
    });

    // Create notification
    await db.notification.create({
      data: {
        tenantId: session.tenantId,
        userId: assignTo.userId,
        type: 'assignment',
        title: 'New Lead Assignment',
        body: `You have been assigned to lead: ${lead.name}`,
        leadId,
      },
    });

    return lead;
  } finally {
    await db.$disconnect();
  }
}

export async function assignUnassignedLeads(teamId?: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:update:any');

    // Find unassigned leads
    const unassignedLeads = await db.lead.findMany({
      where: {
        tenantId: session.tenantId,
        ownerUserId: null,
        deletedAt: null,
      },
      select: { id: true },
      take: 100,
    });

    if (unassignedLeads.length === 0) {
      return { assigned: 0 };
    }

    // Assign each lead using round-robin
    let assigned = 0;
    for (const lead of unassignedLeads) {
      try {
        await assignLeadRoundRobin(lead.id, teamId);
        assigned++;
      } catch (error) {
        // Skip this lead if assignment fails
        console.error(`Failed to assign lead ${lead.id}:`, error);
      }
    }

    return { assigned };
  } finally {
    await db.$disconnect();
  }
}
