'use server';

import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '@lead/permissions';
import { getSessionFromHeaders } from '../auth/middleware';

const db = new PrismaClient();

export async function createTask(data: {
  leadId: string;
  title: string;
  assigneeUserId?: string;
  priority?: string;
  dueDate?: Date;
  description?: string;
}) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:create');

    const task = await db.task.create({
      data: {
        tenantId: session.tenantId,
        leadId: data.leadId,
        title: data.title,
        assigneeUserId: data.assigneeUserId,
        priority: data.priority || 'medium',
        dueDate: data.dueDate,
        description: data.description,
      },
    });

    // Log activity
    await db.activity.create({
      data: {
        tenantId: session.tenantId,
        leadId: data.leadId,
        type: 'task',
        actorUserId: session.userId,
        payload: { taskId: task.id, title: data.title },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'task_created',
        entityType: 'task',
        entityId: task.id,
        metadata: { leadId: data.leadId },
      },
    });

    return task;
  } finally {
    await db.$disconnect();
  }
}

export async function updateTask(taskId: string, data: Partial<{
  title: string;
  priority: string;
  dueDate: Date;
  description: string;
  assigneeUserId: string;
}>) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:update:any');

    const task = await db.task.update({
      where: { id: taskId },
      data,
    });

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'task_updated',
        entityType: 'task',
        entityId: task.id,
      },
    });

    return task;
  } finally {
    await db.$disconnect();
  }
}

export async function completeTask(taskId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:update:any');

    const task = await db.task.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'task_completed',
        entityType: 'task',
        entityId: task.id,
      },
    });

    return task;
  } finally {
    await db.$disconnect();
  }
}

export async function listTasks(filters: {
  leadId?: string;
  assigneeUserId?: string;
  status?: string;
  dueDateStart?: Date;
  dueDateEnd?: Date;
} = {}) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const tasks = await db.task.findMany({
      where: {
        tenantId: session.tenantId,
        ...(filters.leadId && { leadId: filters.leadId }),
        ...(filters.assigneeUserId && { assigneeUserId: filters.assigneeUserId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.dueDateStart || filters.dueDateEnd) && {
          dueDate: {
            ...(filters.dueDateStart && { gte: filters.dueDateStart }),
            ...(filters.dueDateEnd && { lte: filters.dueDateEnd }),
          },
        },
      },
      include: {
        lead: { select: { id: true, name: true } },
        assignee: { select: { id: true, email: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
    });

    return tasks;
  } finally {
    await db.$disconnect();
  }
}

export async function getTasksDueToday() {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await db.task.findMany({
      where: {
        tenantId: session.tenantId,
        status: 'open',
        dueDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        lead: { select: { id: true, name: true } },
        assignee: { select: { id: true, email: true } },
      },
      orderBy: { priority: 'desc' },
    });

    return tasks;
  } finally {
    await db.$disconnect();
  }
}

export async function getOverdueTasks() {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasks = await db.task.findMany({
      where: {
        tenantId: session.tenantId,
        status: 'open',
        dueDate: {
          lt: today,
        },
      },
      include: {
        lead: { select: { id: true, name: true } },
        assignee: { select: { id: true, email: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    return tasks;
  } finally {
    await db.$disconnect();
  }
}
