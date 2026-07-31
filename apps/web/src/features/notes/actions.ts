'use server';

import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '@lead/permissions';
import { getSessionFromHeaders } from '../auth/middleware';

const db = new PrismaClient();

export async function createNote(leadId: string, body: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:update:own');

    const note = await db.note.create({
      data: {
        tenantId: session.tenantId,
        leadId,
        body,
        authorUserId: session.userId,
      },
    });

    // Log activity
    await db.activity.create({
      data: {
        tenantId: session.tenantId,
        leadId,
        type: 'note',
        actorUserId: session.userId,
        payload: { noteId: note.id, preview: body.substring(0, 100) },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'note_created',
        entityType: 'note',
        entityId: note.id,
        metadata: { leadId },
      },
    });

    return note;
  } finally {
    await db.$disconnect();
  }
}

export async function updateNote(noteId: string, body: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:update:own');

    const note = await db.note.update({
      where: { id: noteId },
      data: { body },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'note_updated',
        entityType: 'note',
        entityId: note.id,
      },
    });

    return note;
  } finally {
    await db.$disconnect();
  }
}

export async function deleteNote(noteId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:update:own');

    const note = await db.note.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'note_deleted',
        entityType: 'note',
        entityId: note.id,
      },
    });

    return note;
  } finally {
    await db.$disconnect();
  }
}

export async function listNotes(leadId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const notes = await db.note.findMany({
      where: {
        tenantId: session.tenantId,
        leadId,
        deletedAt: null,
      },
      include: {
        author: { select: { id: true, email: true } },
      },
      orderBy: { isPinned: 'desc', createdAt: 'desc' },
    });

    return notes;
  } finally {
    await db.$disconnect();
  }
}
