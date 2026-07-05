import { proxyBackendRequest } from '@/lib/services/backendProxy';

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ recordingId: string }> },
) {
    const { recordingId } = await params;
    return proxyBackendRequest({
        request,
        upstreamPath: `/recordings/${encodeURIComponent(recordingId)}`,
        method: 'PATCH',
    });
}
