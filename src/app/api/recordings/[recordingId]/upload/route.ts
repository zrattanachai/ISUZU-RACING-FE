import { NextResponse } from 'next/server';

function resolveApiBaseUrl(): string {
    const base = process.env.API_BASE_URL ?? 'http://localhost:4001';
    return base.endsWith('/') ? base.slice(0, -1) : base;
}

/**
 * Custom multipart proxy — cannot use proxyBackendRequest because it reads
 * the body as text which breaks multipart/form-data boundaries.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ recordingId: string }> },
) {
    const { recordingId } = await params;

    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const headers = new Headers();
    const authorization = request.headers.get('authorization');
    if (authorization) headers.set('authorization', authorization);
    const cookie = request.headers.get('cookie');
    if (cookie) headers.set('cookie', cookie);
    // Note: do NOT set Content-Type — fetch sets it automatically with multipart boundary

    const baseUrl = resolveApiBaseUrl();
    try {
        const response = await fetch(
            `${baseUrl}/recordings/${encodeURIComponent(recordingId)}/upload`,
            { method: 'POST', headers, body: formData },
        );
        const data: unknown = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch {
        return NextResponse.json(
            { error: { code: 'UPSTREAM_UNAVAILABLE', message: 'Upload failed' } },
            { status: 502 },
        );
    }
}
