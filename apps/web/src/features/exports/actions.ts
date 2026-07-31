'use server';

import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '@lead/permissions';
import { getSessionFromHeaders } from '../auth/middleware';

const db = new PrismaClient();

export async function initiateLeadsExport(filters: Record<string, unknown> = {}) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:read:any');

    const csvExport = await db.csvExport.create({
      data: {
        tenantId: session.tenantId,
        userId: session.userId,
        exportType: 'leads',
        filters,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Log audit
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'export_initiated',
        entityType: 'export',
        entityId: csvExport.id,
        metadata: { exportType: 'leads', filters },
      },
    });

    // In Phase 8, this would trigger an Inngest job to generate the CSV asynchronously
    // For now, return the export job ID

    return { exportId: csvExport.id, status: 'pending' };
  } finally {
    await db.$disconnect();
  }
}

export async function getExportStatus(exportId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const csvExport = await db.csvExport.findUnique({
      where: { id: exportId },
    });

    if (!csvExport || csvExport.tenantId !== session.tenantId) {
      throw new Error('Not found');
    }

    return {
      id: csvExport.id,
      status: csvExport.status,
      rowCount: csvExport.rowCount,
      fileUrl: csvExport.fileUrl,
      error: csvExport.error,
      completedAt: csvExport.completedAt,
    };
  } finally {
    await db.$disconnect();
  }
}

export async function listUserExports(limit = 20) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const exports = await db.csvExport.findMany({
      where: {
        tenantId: session.tenantId,
        userId: session.userId,
      },
      select: {
        id: true,
        exportType: true,
        status: true,
        rowCount: true,
        fileUrl: true,
        createdAt: true,
        completedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return exports;
  } finally {
    await db.$disconnect();
  }
}

export async function retryFailedExport(exportId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const csvExport = await db.csvExport.findUnique({
      where: { id: exportId },
    });

    if (!csvExport || csvExport.tenantId !== session.tenantId) {
      throw new Error('Not found');
    }

    if (csvExport.status !== 'failed') {
      throw new Error('Export is not in failed state');
    }

    // Reset export to pending for retry
    const retried = await db.csvExport.update({
      where: { id: exportId },
      data: { status: 'pending', error: null },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'export_retried',
        entityType: 'export',
        entityId: exportId,
      },
    });

    return { exportId: retried.id, status: 'pending' };
  } finally {
    await db.$disconnect();
  }
}
