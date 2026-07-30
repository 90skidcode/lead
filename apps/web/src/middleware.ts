import { NextRequest } from 'next/server';
import { resolveSession } from './features/auth/middleware';

export async function middleware(request: NextRequest) {
  const { session, response } = await resolveSession(request);

  if (session) {
    response.headers.set('x-tenant-id', session.tenantId);
    response.headers.set('x-user-id', session.userId);
    response.headers.set('x-user-role', session.role);
    if (session.isPlatformSuperAdmin) {
      response.headers.set('x-is-super-admin', 'true');
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
