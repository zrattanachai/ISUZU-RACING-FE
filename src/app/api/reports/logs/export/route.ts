import { proxyBackendRequest } from '@/lib/services/backendProxy';

export async function GET(request: Request) {
    return proxyBackendRequest({
        request,
        upstreamPath: '/reports/logs/export',
        method: 'GET',
    });
}