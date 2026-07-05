import { proxyRealtimeRequest } from '@/lib/services/backendProxy';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  return proxyRealtimeRequest({
    request,
    upstreamPath: '/tasks',
    method: 'GET',
  });
}

export async function POST(request: NextRequest) {
  return proxyRealtimeRequest({
    request,
    upstreamPath: '/tasks',
    method: 'POST',
  });
}
