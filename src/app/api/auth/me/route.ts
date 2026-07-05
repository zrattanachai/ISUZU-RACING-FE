import { proxyBackendRequest } from '@/lib/services/backendProxy';

export async function GET(request: Request) {
  return proxyBackendRequest({
    request,
    upstreamPath: '/auth/me',
    method: 'GET',
  });
}
