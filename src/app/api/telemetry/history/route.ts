import { proxyBackendRequest } from '@/lib/services/backendProxy';

export async function GET(request: Request) {
  return proxyBackendRequest({
    request,
    upstreamPath: '/telemetry/history',
    method: 'GET',
  });
}
