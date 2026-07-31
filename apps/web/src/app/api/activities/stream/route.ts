import { headers } from 'next/headers';
import type { Session } from '@lead/auth';

export const dynamic = 'force-dynamic';

function getSessionFromHeaders(headersList: Headers): Session | null {
  const tenantId = headersList.get('x-tenant-id');
  const userId = headersList.get('x-user-id');
  const userRole = headersList.get('x-user-role');

  if (!tenantId || !userId || !userRole) {
    return null;
  }

  return {
    userId,
    userEmail: '',
    tenantId,
    role: userRole as Session['role'],
    isPlatformSuperAdmin: headersList.get('x-is-super-admin') === 'true',
    expiresAt: new Date(),
  };
}

export async function GET() {
  const headersList = await headers();
  const session = getSessionFromHeaders(headersList);

  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(
        `data: ${JSON.stringify({ type: 'connected' })}\n\n`
      );

      // Simulate activity updates (in production, use actual event source)
      const interval = setInterval(() => {
        controller.enqueue(
          `data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`
        );
      }, 30000);

      // Cleanup on close
      const onAbort = () => {
        clearInterval(interval);
        controller.close();
      };

      // Handle client disconnect
      const abortController = new AbortController();
      abortController.signal.addEventListener('abort', onAbort);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
