'use server';

import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '@lead/permissions';
import { getSessionFromHeaders } from '../auth/middleware';

const db = new PrismaClient();

export async function createLead(data: {
  name: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  sourceId?: string;
  companyId?: string;
  status?: string;
  ownerUserId?: string;
  teamId?: string;
  priority?: string;
  description?: string;
}) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:create');

    const lead = await db.lead.create({
      data: {
        tenantId: session.tenantId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        jobTitle: data.jobTitle,
        sourceId: data.sourceId,
        companyId: data.companyId,
        status: data.status || 'new',
        ownerUserId: data.ownerUserId || session.userId,
        teamId: data.teamId,
        priority: data.priority || 'medium',
        description: data.description,
        createdBy: session.userId,
        updatedBy: session.userId,
      },
    });

    // Log creation
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'lead_created',
        entityType: 'lead',
        entityId: lead.id,
        metadata: { name: data.name, email: data.email },
      },
    });

    return lead;
  } finally {
    await db.$disconnect();
  }
}

export async function getLead(leadId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const lead = await db.lead.findUnique({
      where: { id: leadId },
      include: {
        source: true,
        company: true,
        ownerUser: { select: { id: true, email: true } },
        team: true,
        leadContacts: { include: { contact: true } },
        leadTags: { include: { tag: true } },
      },
    });

    if (!lead || lead.tenantId !== session.tenantId) {
      throw new Error('Not found');
    }

    return lead;
  } finally {
    await db.$disconnect();
  }
}

export async function updateLead(
  leadId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    status?: string;
    ownerUserId?: string;
    priority?: string;
    score?: number;
    description?: string;
  }
) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:update:any');

    const lead = await db.lead.update({
      where: { id: leadId },
      data: {
        ...data,
        updatedBy: session.userId,
      },
    });

    // Log update
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'lead_updated',
        entityType: 'lead',
        entityId: lead.id,
        metadata: data,
      },
    });

    return lead;
  } finally {
    await db.$disconnect();
  }
}

export async function archiveLead(leadId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:delete');

    const lead = await db.lead.update({
      where: { id: leadId },
      data: { deletedAt: new Date() },
    });

    // Log archival
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'lead_archived',
        entityType: 'lead',
        entityId: lead.id,
      },
    });

    return lead;
  } finally {
    await db.$disconnect();
  }
}

export async function restoreLead(leadId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:delete');

    const lead = await db.lead.update({
      where: { id: leadId },
      data: { deletedAt: null },
    });

    // Log restoration
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'lead_restored',
        entityType: 'lead',
        entityId: lead.id,
      },
    });

    return lead;
  } finally {
    await db.$disconnect();
  }
}

interface ListLeadsFilters {
  status?: string;
  ownerUserId?: string;
  teamId?: string;
  sourceId?: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

export async function listLeads(filters: ListLeadsFilters = {}) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const limit = filters.limit || 20;
    const cursor = filters.cursor ? { id: filters.cursor } : undefined;

    const leads = await db.lead.findMany({
      where: {
        tenantId: session.tenantId,
        deletedAt: null,
        ...(filters.status && { status: filters.status }),
        ...(filters.ownerUserId && { ownerUserId: filters.ownerUserId }),
        ...(filters.teamId && { teamId: filters.teamId }),
        ...(filters.sourceId && { sourceId: filters.sourceId }),
        ...(filters.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
            { phone: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        ownerUser: { select: { id: true, email: true } },
        source: true,
        company: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      skip: cursor ? 1 : 0,
      cursor,
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

export async function bulkAssignLeads(leadIds: string[], ownerUserId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:update:any');

    const result = await db.lead.updateMany({
      where: {
        id: { in: leadIds },
        tenantId: session.tenantId,
      },
      data: {
        ownerUserId,
        updatedBy: session.userId,
      },
    });

    // Log bulk assignment
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'leads_bulk_assigned',
        entityType: 'lead',
        entityId: 'bulk',
        metadata: { leadIds, ownerUserId, count: result.count },
      },
    });

    return { count: result.count };
  } finally {
    await db.$disconnect();
  }
}

export async function bulkArchiveLeads(leadIds: string[]) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:delete');

    const result = await db.lead.updateMany({
      where: {
        id: { in: leadIds },
        tenantId: session.tenantId,
      },
      data: {
        deletedAt: new Date(),
        updatedBy: session.userId,
      },
    });

    // Log bulk archival
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'leads_bulk_archived',
        entityType: 'lead',
        entityId: 'bulk',
        metadata: { leadIds, count: result.count },
      },
    });

    return { count: result.count };
  } finally {
    await db.$disconnect();
  }
}
