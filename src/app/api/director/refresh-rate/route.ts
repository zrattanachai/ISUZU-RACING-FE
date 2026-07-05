import { proxyRealtimeRequest } from '@/lib/services/backendProxy';

export async function GET(request: Request) {
  return proxyRealtimeRequest({
    request,
    upstreamPath: '/director/refresh-rate',
    method: 'GET',
  });
}

export async function PUT(request: Request) {
  return proxyRealtimeRequest({
    request,
    upstreamPath: '/director/refresh-rate',
    method: 'PUT',
  });
}
