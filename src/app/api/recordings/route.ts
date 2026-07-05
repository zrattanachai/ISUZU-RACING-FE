import { proxyBackendRequest } from '@/lib/services/backendProxy';

export async function GET(request: Request) {
  return proxyBackendRequest({
    request,
    upstreamPath: '/recordings',
    method: 'GET',
  });
}

export async function POST(request: Request) {
  return proxyBackendRequest({
    request,
    upstreamPath: '/recordings',
    method: 'POST',
  });
}
