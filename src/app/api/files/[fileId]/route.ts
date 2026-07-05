import { proxyBackendRequest } from '@/lib/services/backendProxy';

export async function DELETE(
  request: Request,
  context: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await context.params;

  return proxyBackendRequest({
    request,
    upstreamPath: `/files/${encodeURIComponent(fileId)}`,
    method: 'DELETE',
  });
}
