import { proxyRealtimeRequest } from '@/lib/services/backendProxy';

export async function GET(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId } = await context.params;
  return proxyRealtimeRequest({
    request,
    upstreamPath: `/users/${encodeURIComponent(userId)}/preferences/engineering-layout`,
    method: 'GET',
  });
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId } = await context.params;
  return proxyRealtimeRequest({
    request,
    upstreamPath: `/users/${encodeURIComponent(userId)}/preferences/engineering-layout`,
    method: 'PUT',
  });
}
