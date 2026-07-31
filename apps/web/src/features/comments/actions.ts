'use server';

import { headers } from 'next/headers';
import { PrismaClient } from '@prisma/client';
import { requirePermission } from '@lead/permissions';
import { getSessionFromHeaders } from '../auth/middleware';

const db = new PrismaClient();

interface Mention {
  userId: string;
  email: string;
  displayName: string;
}

export async function createComment(
  leadId: string,
  body: string,
  mentions?: Mention[]
) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:read:any');

    const comment = await db.comment.create({
      data: {
        tenantId: session.tenantId,
        leadId,
        authorUserId: session.userId,
        body,
        mentions: mentions || [],
      },
      include: { author: { select: { id: true, email: true } } },
    });

    // Create mention notifications
    if (mentions && mentions.length > 0) {
      await Promise.all(
        mentions.map((mention) =>
          db.notification.create({
            data: {
              tenantId: session.tenantId,
              userId: mention.userId,
              type: 'mention',
              relatedEntityType: 'comment',
              relatedEntityId: comment.id,
              title: `${session.userId} mentioned you`,
              metadata: {
                commentId: comment.id,
                leadId,
                authorEmail: session.userEmail,
              },
            },
          })
        )
      );
    }

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'comment_created',
        entityType: 'comment',
        entityId: comment.id,
        metadata: { leadId, mentions: mentions?.map((m) => m.email) || [] },
      },
    });

    return comment;
  } finally {
    await db.$disconnect();
  }
}

export async function updateComment(
  commentId: string,
  body: string,
  mentions?: Mention[]
) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const existing = await db.comment.findUnique({
      where: { id: commentId },
    });

    if (!existing) {
      throw new Error('Comment not found');
    }

    if (existing.authorUserId !== session.userId) {
      throw new Error('Can only edit your own comments');
    }

    const comment = await db.comment.update({
      where: { id: commentId },
      data: {
        body,
        mentions: mentions || [],
        updatedAt: new Date(),
      },
      include: { author: { select: { id: true, email: true } } },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'comment_updated',
        entityType: 'comment',
        entityId: commentId,
        metadata: { mentions: mentions?.map((m) => m.email) || [] },
      },
    });

    return comment;
  } finally {
    await db.$disconnect();
  }
}

export async function deleteComment(commentId: string) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    const existing = await db.comment.findUnique({
      where: { id: commentId },
    });

    if (!existing) {
      throw new Error('Comment not found');
    }

    if (existing.authorUserId !== session.userId) {
      throw new Error('Can only delete your own comments');
    }

    const comment = await db.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        tenantId: session.tenantId,
        actorUserId: session.userId,
        action: 'comment_deleted',
        entityType: 'comment',
        entityId: commentId,
        metadata: { originalBody: existing.body },
      },
    });

    return comment;
  } finally {
    await db.$disconnect();
  }
}

export async function listComments(
  leadId: string,
  cursor?: string,
  limit: number = 50
) {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    throw new Error('Unauthorized');
  }

  try {
    requirePermission(session, 'lead:read:any');

    const comments = await db.comment.findMany({
      where: {
        tenantId: session.tenantId,
        leadId,
        deletedAt: null,
      },
      include: {
        author: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
    });

    const hasMore = comments.length > limit;
    const items = hasMore ? comments.slice(0, limit) : comments;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  } finally {
    await db.$disconnect();
  }
}
