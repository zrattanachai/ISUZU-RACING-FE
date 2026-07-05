import { proxyRealtimeRequest } from '@/lib/services/backendProxy';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  const { vehicleId } = await params;
  return proxyRealtimeRequest({
    request,
    upstreamPath: `/vehicles/${encodeURIComponent(vehicleId)}/stream`,
    method: 'GET',
  });
}
