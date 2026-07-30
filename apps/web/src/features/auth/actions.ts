'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import {
  hashPassword,
  verifyPassword,
  createSession,
  signSessionToken,
  AuthError,
} from '@lead/auth';
import { signupSchema, loginSchema } from '@lead/validation';

const db = new PrismaClient();

const SESSION_COOKIE_NAME = 'session_token';

export async function signup(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const passwordConfirm = formData.get('passwordConfirm') as string;
  const tenantName = formData.get('tenantName') as string;

  try {
    const validated = signupSchema.parse({
      email,
      password,
      passwordConfirm,
      tenantName,
    });

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      throw new AuthError('User already exists', 'USER_EXISTS');
    }

    // Hash password
    const passwordHash = await hashPassword(validated.password);

    // Create user, tenant, and membership in a transaction
    const user = await db.user.create({
      data: {
        email: validated.email,
        passwordHash,
      },
    });

    const tenant = await db.tenant.create({
      data: {
        name: validated.tenantName,
        slug: validated.tenantName.toLowerCase().replace(/\s+/g, '-'),
      },
    });

    // Create owner membership
    await db.tenantUser.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        role: 'OWNER',
        status: 'active',
        joinedAt: new Date(),
      },
    });

    // Create session
    const session = createSession(user.id, user.email, tenant.id, 'OWNER');
    const token = await signSessionToken(session, process.env.SESSION_SECRET!);

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    // Log signup
    await db.auditLog.create({
      data: {
        tenantId: tenant.id,
        actorUserId: user.id,
        action: 'user_signup',
        entityType: 'user',
        entityId: user.id,
      },
    });

    redirect('/dashboard');
  } finally {
    await db.$disconnect();
  }
}

export async function login(email: string, password: string) {
  try {
    const validated = loginSchema.parse({ email, password });

    const user = await db.user.findUnique({
      where: { email: validated.email },
    });

    if (!user) {
      throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    if (user.status === 'disabled') {
      throw new AuthError('Account is disabled', 'ACCOUNT_DISABLED');
    }

    const passwordMatches = await verifyPassword(validated.password, user.passwordHash);
    if (!passwordMatches) {
      throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // Get user's first active tenant
    const tenantMembership = await db.tenantUser.findFirst({
      where: {
        userId: user.id,
        status: 'active',
      },
      include: { tenant: true },
    });

    if (!tenantMembership) {
      throw new AuthError('No active tenant membership', 'NO_TENANT');
    }

    // Create session
    const session = createSession(
      user.id,
      user.email,
      tenantMembership.tenantId,
      tenantMembership.role,
      user.isPlatformSuperAdmin
    );

    const token = await signSessionToken(session, process.env.SESSION_SECRET!);

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    // Log login
    await db.auditLog.create({
      data: {
        tenantId: tenantMembership.tenantId,
        actorUserId: user.id,
        action: 'user_login',
        entityType: 'user',
        entityId: user.id,
      },
    });

    redirect('/dashboard');
  } finally {
    await db.$disconnect();
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect('/');
}

export async function switchTenant(newTenantId: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      throw new AuthError('No session', 'NO_SESSION');
    }

    const { verifySessionToken } = await import('@lead/auth');
    const session = await verifySessionToken(token, process.env.SESSION_SECRET!);

    if (!session) {
      throw new AuthError('Invalid session', 'INVALID_SESSION');
    }

    // Verify user is member of target tenant
    const membership = await db.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId: newTenantId,
          userId: session.userId,
        },
      },
    });

    if (!membership || membership.status !== 'active') {
      throw new AuthError('Not a member of target tenant', 'FORBIDDEN');
    }

    // Create new session with new tenant
    const newSession = createSession(
      session.userId,
      session.userEmail,
      newTenantId,
      membership.role,
      session.isPlatformSuperAdmin
    );

    const newToken = await signSessionToken(newSession, process.env.SESSION_SECRET!);

    // Update session cookie
    cookieStore.set(SESSION_COOKIE_NAME, newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    redirect('/dashboard');
  } finally {
    await db.$disconnect();
  }
}
