import { proxyBackendRequest } from '@/lib/services/backendProxy';

export async function GET(request: Request) {
  return proxyBackendRequest({
    request,
    upstreamPath: '/alert-thresholds',
    method: 'GET',
  });
}

export async function PUT(request: Request) {
  return proxyBackendRequest({
    request,
    upstreamPath: '/alert-thresholds',
    method: 'PUT',
  });
}
