'use server';

import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { getSessionFromHeaders } from '../auth/middleware';

const db = new PrismaClient();

export async function getNotifications(unreadOnly = true, limit = 50) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const notifications = await db.notification.findMany({
      where: {
        tenantId: session.tenantId,
        userId: session.userId,
        ...(unreadOnly && { readAt: null }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return notifications;
  } finally {
    await db.$disconnect();
  }
}

export async function markNotificationRead(notificationId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const notification = await db.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return notification;
  } finally {
    await db.$disconnect();
  }
}

export async function markAllNotificationsRead() {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const result = await db.notification.updateMany({
      where: {
        tenantId: session.tenantId,
        userId: session.userId,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return { marked: result.count };
  } finally {
    await db.$disconnect();
  }
}

export async function getUnreadCount() {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const count = await db.notification.count({
      where: {
        tenantId: session.tenantId,
        userId: session.userId,
        readAt: null,
      },
    });

    return count;
  } finally {
    await db.$disconnect();
  }
}
