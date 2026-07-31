'use server';

import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { getSessionFromHeaders } from '../auth/middleware';

const db = new PrismaClient();

export async function updateLeadScore(leadId: string, newScore: number, reason?: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    // Get current lead
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      select: { score: true, tenantId: true },
    });

    if (!lead || lead.tenantId !== session.tenantId) {
      throw new Error('Not found');
    }

    const oldScore = lead.score;

    // Only update if score changed
    if (oldScore === newScore) {
      return { updated: false };
    }

    // Update lead score
    await db.lead.update({
      where: { id: leadId },
      data: { score: newScore },
    });

    // Record score change history
    await db.leadScoreHistory.create({
      data: {
        tenantId: session.tenantId,
        leadId,
        oldScore,
        newScore,
        reason,
      },
    });

    // Log activity
    await db.activity.create({
      data: {
        tenantId: session.tenantId,
        leadId,
        type: 'system_event',
        actorUserId: session.userId,
        payload: {
          event: 'score_updated',
          oldScore,
          newScore,
          reason,
        },
      },
    });

    return { updated: true, oldScore, newScore };
  } finally {
    await db.$disconnect();
  }
}

export async function getScoreHistory(leadId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const history = await db.leadScoreHistory.findMany({
      where: {
        tenantId: session.tenantId,
        leadId,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return history;
  } finally {
    await db.$disconnect();
  }
}
