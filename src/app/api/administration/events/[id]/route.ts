import { proxyRealtimeRequest } from '@/lib/services/backendProxy';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyRealtimeRequest({
    request,
    upstreamPath: `/administration/events/${encodeURIComponent(id)}`,
    method: 'PUT',
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyRealtimeRequest({
    request,
    upstreamPath: `/administration/events/${encodeURIComponent(id)}`,
    method: 'DELETE',
  });
}
