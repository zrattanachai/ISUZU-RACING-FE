import { proxyBackendRequest } from '@/lib/services/backendProxy';

export async function POST(request: Request) {
    return proxyBackendRequest({
        request,
        upstreamPath: '/files/folder',
        method: 'POST',
    });
}
