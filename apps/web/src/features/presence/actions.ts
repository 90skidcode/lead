'use server';

import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { getSessionFromHeaders } from '../auth/middleware';

const db = new PrismaClient();

export async function updateUserPresence(
  entityType?: string,
  entityId?: string
) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const now = new Date();
    const presence = await db.userPresence.upsert({
      where: {
        tenantId_userId: {
          tenantId: session.tenantId,
          userId: session.userId,
        },
      },
      create: {
        tenantId: session.tenantId,
        userId: session.userId,
        viewingEntityType: entityType,
        viewingEntityId: entityId,
        lastSeenAt: now,
        updatedAt: now,
      },
      update: {
        viewingEntityType: entityType,
        viewingEntityId: entityId,
        lastSeenAt: now,
        updatedAt: now,
      },
    });

    return presence;
  } finally {
    await db.$disconnect();
  }
}

export async function getUserPresence(entityType: string, entityId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const presences = await db.userPresence.findMany({
      where: {
        tenantId: session.tenantId,
        viewingEntityType: entityType,
        viewingEntityId: entityId,
      },
      select: {
        userId: true,
        user: {
          select: {
            email: true,
          },
        },
        lastSeenAt: true,
      },
    });

    return presences;
  } finally {
    await db.$disconnect();
  }
}

export async function clearUserPresence() {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    await db.userPresence.delete({
      where: {
        tenantId_userId: {
          tenantId: session.tenantId,
          userId: session.userId,
        },
      },
    });
  } finally {
    await db.$disconnect();
  }
}

export async function removeExpiredPresences(
  minutesThreshold: number = 5
) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const cutoffTime = new Date(
      Date.now() - minutesThreshold * 60 * 1000
    );

    await db.userPresence.deleteMany({
      where: {
        tenantId: session.tenantId,
        lastSeenAt: { lt: cutoffTime },
      },
    });
  } finally {
    await db.$disconnect();
  }
}

export async function getEntityViewers(
  entityType: string,
  entityId: string
) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    // Get presence records updated within last 2 minutes (still active)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const viewers = await db.userPresence.findMany({
      where: {
        tenantId: session.tenantId,
        viewingEntityType: entityType,
        viewingEntityId: entityId,
        lastSeenAt: { gt: twoMinutesAgo },
      },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        lastSeenAt: true,
      },
    });

    // Filter out current user
    return viewers.filter(
      (v: { userId: string }) => v.userId !== session.userId
    );
  } finally {
    await db.$disconnect();
  }
}
