import { proxyRealtimeRequest } from '@/lib/services/backendProxy';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyRealtimeRequest({
    request,
    upstreamPath: `/administration/garages/${encodeURIComponent(id)}`,
    method: 'DELETE',
  });
}
