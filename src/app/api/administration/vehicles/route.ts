import { proxyBackendRequest } from '@/lib/services/backendProxy';

export async function GET(request: Request) {
  return proxyBackendRequest({
    request,
    upstreamPath: '/administration/vehicles',
    method: 'GET',
  });
}

export async function POST(request: Request) {
  return proxyBackendRequest({
    request,
    upstreamPath: '/administration/vehicles',
    method: 'POST',
  });
}
