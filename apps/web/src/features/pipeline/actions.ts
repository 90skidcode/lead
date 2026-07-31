'use server';

import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '@lead/permissions';
import { getSessionFromHeaders } from '../auth/middleware';

const db = new PrismaClient();

export async function createPipeline(name: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'pipeline:manage');

    const pipeline = await db.pipeline.create({
      data: {
        tenantId: session.tenantId,
        name,
      },
    });

    // Log creation
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'pipeline_created',
        entityType: 'pipeline',
        entityId: pipeline.id,
        metadata: { name },
      },
    });

    return pipeline;
  } finally {
    await db.$disconnect();
  }
}

export async function createPipelineStage(data: {
  pipelineId: string;
  name: string;
  sortOrder?: number;
  probability?: number;
  isWon?: boolean;
  isLost?: boolean;
}) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'pipeline:manage');

    const stage = await db.pipelineStage.create({
      data: {
        tenantId: session.tenantId,
        pipelineId: data.pipelineId,
        name: data.name,
        sortOrder: data.sortOrder || 0,
        probability: data.probability || 50,
        isWon: data.isWon || false,
        isLost: data.isLost || false,
      },
    });

    // Log creation
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'pipeline_stage_created',
        entityType: 'pipeline_stage',
        entityId: stage.id,
        metadata: { name: data.name },
      },
    });

    return stage;
  } finally {
    await db.$disconnect();
  }
}

export async function listPipelines() {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const pipelines = await db.pipeline.findMany({
      where: { tenantId: session.tenantId },
      include: {
        stages: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });

    return pipelines;
  } finally {
    await db.$disconnect();
  }
}

export async function getPipeline(pipelineId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const pipeline = await db.pipeline.findUnique({
      where: { id: pipelineId },
      include: {
        stages: { orderBy: { sortOrder: 'asc' } },
        leads: {
          where: { deletedAt: null },
          include: { ownerUser: { select: { id: true, email: true } } },
        },
      },
    });

    if (!pipeline || pipeline.tenantId !== session.tenantId) {
      throw new Error('Not found');
    }

    return pipeline;
  } finally {
    await db.$disconnect();
  }
}

export async function getStageLeads(stageId: string, pipelineId: string, limit = 20, cursor?: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const cursorObj = cursor ? { id: cursor } : undefined;

    const leads = await db.lead.findMany({
      where: {
        tenantId: session.tenantId,
        stageId,
        pipelineId,
        deletedAt: null,
      },
      include: {
        ownerUser: { select: { id: true, email: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      skip: cursorObj ? 1 : 0,
      cursor: cursorObj,
    });

    const hasMore = leads.length > limit;
    const data = hasMore ? leads.slice(0, limit) : leads;

    return {
      data,
      nextCursor: hasMore ? data[data.length - 1]?.id : null,
      hasMore,
    };
  } finally {
    await db.$disconnect();
  }
}

export async function moveLeadToStage(leadId: string, stageId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'pipeline:manage');

    const lead = await db.lead.findUnique({
      where: { id: leadId },
      select: { stageId: true, tenantId: true },
    });

    if (!lead || lead.tenantId !== session.tenantId) {
      throw new Error('Not found');
    }

    const oldStageId = lead.stageId;

    const updatedLead = await db.lead.update({
      where: { id: leadId },
      data: { stageId },
    });

    // Log stage change activity
    await db.activity.create({
      data: {
        tenantId: session.tenantId,
        leadId,
        type: 'stage_change',
        actorUserId: session.userId,
        payload: {
          fromStageId: oldStageId,
          toStageId: stageId,
        },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'lead_stage_changed',
        entityType: 'lead',
        entityId: leadId,
        metadata: { fromStageId: oldStageId, toStageId: stageId },
      },
    });

    return updatedLead;
  } finally {
    await db.$disconnect();
  }
}
