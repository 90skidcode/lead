'use server';

import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '@lead/permissions';
import { getSessionFromHeaders } from '../auth/middleware';

const db = new PrismaClient();

export async function getLeadOverviewStats() {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'report:view_team');

    // Check for recent snapshot
    const snapshot = await db.reportSnapshot.findUnique({
      where: {
        tenantId_reportType_params: {
          tenantId: session.tenantId,
          reportType: 'lead_overview',
          params: {},
        },
      },
    });

    if (snapshot && new Date(snapshot.computedAt).getTime() > Date.now() - 60 * 60 * 1000) {
      // Return cached snapshot if less than 1 hour old
      return snapshot.data;
    }

    // Compute live stats
    const [totalLeads, newLeads, qualifiedLeads, wonLeads, lostLeads] = await Promise.all([
      db.lead.count({ where: { tenantId: session.tenantId, deletedAt: null } }),
      db.lead.count({
        where: {
          tenantId: session.tenantId,
          status: 'new',
          deletedAt: null,
        },
      }),
      db.lead.count({
        where: {
          tenantId: session.tenantId,
          status: 'qualified',
          deletedAt: null,
        },
      }),
      db.lead.count({
        where: {
          tenantId: session.tenantId,
          status: 'won',
          deletedAt: null,
        },
      }),
      db.lead.count({
        where: {
          tenantId: session.tenantId,
          status: 'lost',
          deletedAt: null,
        },
      }),
    ]);

    const stats = {
      totalLeads,
      newLeads,
      qualifiedLeads,
      wonLeads,
      lostLeads,
      conversionRate: totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0,
    };

    return stats;
  } finally {
    await db.$disconnect();
  }
}

export async function getRepPerformanceStats(userId?: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'report:view_team');

    const repsToQuery = userId ? [userId] : undefined;

    const stats = await db.tenantUser.findMany({
      where: {
        tenantId: session.tenantId,
        status: 'active',
        role: { in: ['SALES_REP'] },
        ...(repsToQuery && { userId: { in: repsToQuery } }),
      },
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    // Compute per-rep stats
    const repStats = await Promise.all(
      stats.map(async (rep) => ({
        userId: rep.userId,
        email: rep.user.email,
        leadsAssigned: await db.lead.count({
          where: {
            tenantId: session.tenantId,
            ownerUserId: rep.userId,
            deletedAt: null,
          },
        }),
        leadsWon: await db.lead.count({
          where: {
            tenantId: session.tenantId,
            ownerUserId: rep.userId,
            status: 'won',
          },
        }),
        leadsInProgress: await db.lead.count({
          where: {
            tenantId: session.tenantId,
            ownerUserId: rep.userId,
            status: { in: ['contacted', 'qualified'] },
            deletedAt: null,
          },
        }),
      }))
    );

    return repStats;
  } finally {
    await db.$disconnect();
  }
}

export async function getPipelineFunnelStats() {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'report:view_team');

    const stages = await db.pipelineStage.findMany({
      where: {
        pipeline: { tenantId: session.tenantId },
      },
      select: { id: true, name: true, pipelineId: true },
    });

    const funnel = await Promise.all(
      stages.map(async (stage) => ({
        stageName: stage.name,
        leadCount: await db.lead.count({
          where: {
            tenantId: session.tenantId,
            stageId: stage.id,
            deletedAt: null,
          },
        }),
      }))
    );

    return funnel;
  } finally {
    await db.$disconnect();
  }
}
