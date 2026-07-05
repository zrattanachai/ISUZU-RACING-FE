import { proxyBackendRequest } from '@/lib/services/backendProxy';

export async function POST(request: Request) {
    return proxyBackendRequest({
        request,
        upstreamPath: '/recordings/start',
        method: 'POST',
    });
}
