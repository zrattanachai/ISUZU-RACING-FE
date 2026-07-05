import { proxyRealtimeRequest } from '@/lib/services/backendProxy';

export async function GET(request: Request) {
  return proxyRealtimeRequest({
    request,
    upstreamPath: '/administration/garages',
    method: 'GET',
  });
}

export async function POST(request: Request) {
  return proxyRealtimeRequest({
    request,
    upstreamPath: '/administration/garages',
    method: 'POST',
  });
}
