'use server';

import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '@lead/permissions';
import { getSessionFromHeaders } from '../auth/middleware';

const db = new PrismaClient();

export async function createCompany(data: {
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  description?: string;
}) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:create');

    const company = await db.company.create({
      data: {
        tenantId: session.tenantId,
        name: data.name,
        domain: data.domain,
        industry: data.industry,
        size: data.size,
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
        action: 'company_created',
        entityType: 'company',
        entityId: company.id,
        metadata: { name: data.name },
      },
    });

    return company;
  } finally {
    await db.$disconnect();
  }
}

export async function updateCompany(companyId: string, data: Partial<{
  name: string;
  domain: string;
  industry: string;
  size: string;
  description: string;
}>) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:update:any');

    const company = await db.company.update({
      where: { id: companyId },
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
        action: 'company_updated',
        entityType: 'company',
        entityId: company.id,
      },
    });

    return company;
  } finally {
    await db.$disconnect();
  }
}

export async function listCompanies(search?: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const companies = await db.company.findMany({
      where: {
        tenantId: session.tenantId,
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { domain: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        contacts: { select: { id: true, name: true }, take: 5 },
      },
      orderBy: { name: 'asc' },
      take: 100,
    });

    return companies;
  } finally {
    await db.$disconnect();
  }
}

export async function getCompany(companyId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const company = await db.company.findUnique({
      where: { id: companyId },
      include: {
        contacts: true,
        leads: { where: { deletedAt: null } },
      },
    });

    if (!company || company.tenantId !== session.tenantId) {
      throw new Error('Not found');
    }

    return company;
  } finally {
    await db.$disconnect();
  }
}
