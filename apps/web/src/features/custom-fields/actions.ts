'use server';

import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '@lead/permissions';
import { getSessionFromHeaders } from '../auth/middleware';

const db = new PrismaClient();

export async function createCustomFieldDefinition(data: {
  name: string;
  entityType: string;
  fieldType: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox';
  required?: boolean;
  options?: string[];
  description?: string;
}) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'tenant:manage');

    const definition = await db.customFieldDefinition.create({
      data: {
        tenantId: session.tenantId,
        name: data.name,
        entityType: data.entityType,
        fieldType: data.fieldType,
        required: data.required || false,
        options: data.options || [],
        description: data.description,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'custom_field_created',
        entityType: 'custom_field_definition',
        entityId: definition.id,
        metadata: data,
      },
    });

    return definition;
  } finally {
    await db.$disconnect();
  }
}

export async function updateCustomFieldDefinition(
  fieldId: string,
  data: {
    name?: string;
    description?: string;
    options?: string[];
    required?: boolean;
  }
) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'tenant:manage');

    const definition = await db.customFieldDefinition.update({
      where: { id: fieldId },
      data,
    });

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'custom_field_updated',
        entityType: 'custom_field_definition',
        entityId: fieldId,
        metadata: data,
      },
    });

    return definition;
  } finally {
    await db.$disconnect();
  }
}

export async function deleteCustomFieldDefinition(fieldId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'tenant:manage');

    // Delete all associated values first
    await db.customFieldValue.deleteMany({
      where: { fieldId },
    });

    const definition = await db.customFieldDefinition.delete({
      where: { id: fieldId },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'custom_field_deleted',
        entityType: 'custom_field_definition',
        entityId: fieldId,
        metadata: { name: definition.name },
      },
    });

    return definition;
  } finally {
    await db.$disconnect();
  }
}

export async function listCustomFieldDefinitions(entityType: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const definitions = await db.customFieldDefinition.findMany({
      where: {
        tenantId: session.tenantId,
        entityType,
      },
      orderBy: { createdAt: 'asc' },
    });

    return definitions;
  } finally {
    await db.$disconnect();
  }
}

export async function setCustomFieldValue(
  entityId: string,
  fieldId: string,
  value: unknown
) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const fieldValue = await db.customFieldValue.upsert({
      where: {
        entityId_fieldId: {
          entityId,
          fieldId,
        },
      },
      create: {
        entityId,
        fieldId,
        value,
      },
      update: { value },
    });

    return fieldValue;
  } finally {
    await db.$disconnect();
  }
}

export async function getCustomFieldValues(entityId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const values = await db.customFieldValue.findMany({
      where: { entityId },
      include: { field: true },
    });

    return values;
  } finally {
    await db.$disconnect();
  }
}

export async function deleteCustomFieldValue(entityId: string, fieldId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    await db.customFieldValue.delete({
      where: {
        entityId_fieldId: {
          entityId,
          fieldId,
        },
      },
    });
  } finally {
    await db.$disconnect();
  }
}
