import { proxyBackendRequest } from '@/lib/services/backendProxy';

export async function GET(
  request: Request,
  context: { params: Promise<{ carId: string }> }
) {
  const { carId } = await context.params;
  return proxyBackendRequest({
    request,
    upstreamPath: `/engineering/cars/${carId}/snapshot`,
    method: 'GET',
  });
}
