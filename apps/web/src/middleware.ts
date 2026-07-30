import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // This is a placeholder middleware for tenant/session resolution.
  // Full implementation in Phase 1.
  // For now, we're just setting up the structure.

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
