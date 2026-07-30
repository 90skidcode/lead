'use server';

import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '@lead/permissions';
import { getSessionFromHeaders } from '../auth/middleware';

const db = new PrismaClient();

export async function createContact(data: {
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  companyId?: string;
}) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:create');

    const contact = await db.contact.create({
      data: {
        tenantId: session.tenantId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        title: data.title,
        companyId: data.companyId,
        createdBy: session.userId,
        updatedBy: session.userId,
      },
    });

    // Log creation
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'contact_created',
        entityType: 'contact',
        entityId: contact.id,
        metadata: { name: data.name, email: data.email },
      },
    });

    return contact;
  } finally {
    await db.$disconnect();
  }
}

export async function updateContact(contactId: string, data: Partial<{
  name: string;
  email: string;
  phone: string;
  title: string;
  companyId: string;
}>) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:update:any');

    const contact = await db.contact.update({
      where: { id: contactId },
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
        action: 'contact_updated',
        entityType: 'contact',
        entityId: contact.id,
      },
    });

    return contact;
  } finally {
    await db.$disconnect();
  }
}

export async function listContacts(filters: { companyId?: string; search?: string } = {}) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const contacts = await db.contact.findMany({
      where: {
        tenantId: session.tenantId,
        ...(filters.companyId && { companyId: filters.companyId }),
        ...(filters.search && {
          OR: [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
          ],
        }),
      },
      include: {
        company: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return contacts;
  } finally {
    await db.$disconnect();
  }
}
