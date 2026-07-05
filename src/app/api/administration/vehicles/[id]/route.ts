import { proxyBackendRequest } from '@/lib/services/backendProxy';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyBackendRequest({
    request,
    upstreamPath: `/administration/vehicles/${encodeURIComponent(id)}`,
    method: 'PUT',
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyBackendRequest({
    request,
    upstreamPath: `/administration/vehicles/${encodeURIComponent(id)}`,
    method: 'DELETE',
  });
}
