import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, Session } from '@lead/auth';

const SESSION_COOKIE_NAME = 'session_token';
const PUBLIC_AUTH_ROUTES = ['/login', '/signup'];
const ADMIN_ROUTES = ['/admin'];

export async function resolveSession(request: NextRequest): Promise<{
  session: Session | null;
  response: NextResponse;
}> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  let session: Session | null = null;

  if (token) {
    session = await verifySessionToken(token, process.env.SESSION_SECRET!);
  }

  const pathname = request.nextUrl.pathname;
  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname.startsWith(route));

  // Redirect root path based on authentication status
  if (pathname === '/') {
    if (!session) {
      return {
        session: null,
        response: NextResponse.redirect(new URL('/login', request.url)),
      };
    }
    return {
      session,
      response: NextResponse.redirect(new URL('/dashboard', request.url)),
    };
  }

  // Redirect unauthenticated users to login (except on public auth routes)
  if (!session && !isPublicAuthRoute) {
    return {
      session: null,
      response: NextResponse.redirect(new URL('/login', request.url)),
    };
  }

  // Redirect authenticated users away from auth routes to dashboard
  if (session && isPublicAuthRoute) {
    return {
      session,
      response: NextResponse.redirect(new URL('/dashboard', request.url)),
    };
  }

  // Check super admin access for /admin routes
  if (isAdminRoute && !session?.isPlatformSuperAdmin) {
    return {
      session,
      response: NextResponse.redirect(new URL('/dashboard', request.url)),
    };
  }

  const response = NextResponse.next();

  // Set tenant context header for RLS (will be read by server components/actions)
  if (session) {
    response.headers.set('x-tenant-id', session.tenantId);
    response.headers.set('x-user-id', session.userId);
    response.headers.set('x-user-role', session.role);
  }

  return { session, response };
}

export function getSessionFromHeaders(headers: Headers): Session | null {
  const tenantId = headers.get('x-tenant-id');
  const userId = headers.get('x-user-id');
  const userRole = headers.get('x-user-role');

  if (!tenantId || !userId || !userRole) {
    return null;
  }

  return {
    userId,
    userEmail: '', // Not available from headers; use from token
    tenantId,
    role: userRole as Session['role'],
    isPlatformSuperAdmin: headers.get('x-is-super-admin') === 'true',
    expiresAt: new Date(),
  };
}
