'use server';

import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '@lead/permissions';
import { getSessionFromHeaders } from '../auth/middleware';

const db = new PrismaClient();

export async function getTenantSettings() {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    let settings = await db.tenantSettings.findUnique({
      where: { tenantId: session.tenantId },
    });

    if (!settings) {
      settings = await db.tenantSettings.create({
        data: { tenantId: session.tenantId },
      });
    }

    return settings;
  } finally {
    await db.$disconnect();
  }
}

export async function updateTenantSettings(data: {
  timezone?: string;
  dateFormat?: string;
  currency?: string;
  language?: string;
  leadDefaults?: Record<string, unknown>;
  branding?: Record<string, unknown>;
}) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'tenant:manage');

    const settings = await db.tenantSettings.upsert({
      where: { tenantId: session.tenantId },
      create: {
        tenantId: session.tenantId,
        ...data,
      },
      update: data,
    });

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'tenant_settings_updated',
        entityType: 'tenant_settings',
        entityId: session.tenantId,
        metadata: data,
      },
    });

    return settings;
  } finally {
    await db.$disconnect();
  }
}

export async function getNotificationPreferences(userId?: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const queryUserId = userId || session.userId;

    const preferences = await db.notificationPreference.findMany({
      where: {
        tenantId: session.tenantId,
        userId: queryUserId,
      },
    });

    return preferences;
  } finally {
    await db.$disconnect();
  }
}

export async function updateNotificationPreference(
  eventType: string,
  settings: {
    emailEnabled?: boolean;
    inAppEnabled?: boolean;
    pushEnabled?: boolean;
  }
) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const preference = await db.notificationPreference.upsert({
      where: {
        tenantId_userId_eventType: {
          tenantId: session.tenantId,
          userId: session.userId,
          eventType,
        },
      },
      create: {
        tenantId: session.tenantId,
        userId: session.userId,
        eventType,
        ...settings,
      },
      update: settings,
    });

    return preference;
  } finally {
    await db.$disconnect();
  }
}

export async function updateSyncStatus(
  status: 'synced' | 'syncing' | 'offline' | 'failed',
  error?: string
) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const syncStatus = await db.syncStatus.upsert({
      where: {
        tenantId_userId: {
          tenantId: session.tenantId,
          userId: session.userId,
        },
      },
      create: {
        tenantId: session.tenantId,
        userId: session.userId,
        status,
        lastError: error,
        lastSyncAt: status === 'synced' ? new Date() : undefined,
      },
      update: {
        status,
        lastError: error,
        lastSyncAt: status === 'synced' ? new Date() : undefined,
      },
    });

    return syncStatus;
  } finally {
    await db.$disconnect();
  }
}

export async function getSyncStatus() {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const syncStatus = await db.syncStatus.findUnique({
      where: {
        tenantId_userId: {
          tenantId: session.tenantId,
          userId: session.userId,
        },
      },
    });

    return syncStatus || { status: 'synced', lastSyncAt: new Date() };
  } finally {
    await db.$disconnect();
  }
}
