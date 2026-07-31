'use server';

import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { getSessionFromHeaders } from '../auth/middleware';

const db = new PrismaClient();

export async function listActivities(leadId: string, limit = 30, cursor?: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const cursorObj = cursor ? { id: cursor } : undefined;

    const activities = await db.activity.findMany({
      where: {
        tenantId: session.tenantId,
        leadId,
      },
      include: {
        actor: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      skip: cursorObj ? 1 : 0,
      cursor: cursorObj,
    });

    const hasMore = activities.length > limit;
    const data = hasMore ? activities.slice(0, limit) : activities;

    return {
      data,
      nextCursor: hasMore ? data[data.length - 1]?.id : null,
      hasMore,
    };
  } finally {
    await db.$disconnect();
  }
}

export async function getRecentActivity(limit = 10) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const activities = await db.activity.findMany({
      where: {
        tenantId: session.tenantId,
      },
      include: {
        lead: { select: { id: true, name: true } },
        actor: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return activities;
  } finally {
    await db.$disconnect();
  }
}
