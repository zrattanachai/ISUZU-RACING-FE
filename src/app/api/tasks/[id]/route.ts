import { proxyRealtimeRequest } from '@/lib/services/backendProxy';
import type { NextRequest } from 'next/server';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyRealtimeRequest({
    request,
    upstreamPath: `/tasks/${encodeURIComponent(id)}`,
    method: 'PATCH',
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyRealtimeRequest({
    request,
    upstreamPath: `/tasks/${encodeURIComponent(id)}`,
    method: 'DELETE',
  });
}
