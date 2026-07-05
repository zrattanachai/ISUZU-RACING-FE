import { proxyBackendRequest } from '@/lib/services/backendProxy';

export async function POST(
  request: Request,
  context: { params: Promise<{ carId: string }> }
) {
  const { carId } = await context.params;

  return proxyBackendRequest({
    request,
    upstreamPath: `/engineering/cars/${carId}/recordings`,
    method: 'POST',
  });
}
