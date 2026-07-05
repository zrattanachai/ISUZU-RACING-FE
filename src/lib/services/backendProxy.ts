import { NextResponse } from 'next/server';

interface ProxyOptions {
  request: Request;
  upstreamPath: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

function resolveApiBaseUrl() {
  const baseUrl = process.env.API_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      'API_BASE_URL is required for backend proxy route handlers.'
    );
  }

  return normalizeBaseUrl(baseUrl);
}

function resolveRealtimeBaseUrl() {
  const endpoint = process.env.WS_ENDPOINT;

  if (!endpoint) {
    throw new Error(
      'WS_ENDPOINT is required for realtime backend proxy route handlers.'
    );
  }

  const httpEndpoint = endpoint
    .replace(/^ws:\/\//, 'http://')
    .replace(/^wss:\/\//, 'https://');

  return normalizeBaseUrl(httpEndpoint);
}

function createBackendUrl(
  request: Request,
  upstreamPath: string,
  baseUrl: string
) {
  const sourceUrl = new URL(request.url);
  const normalizedPath = upstreamPath.startsWith('/')
    ? upstreamPath.slice(1)
    : upstreamPath;
  const targetUrl = new URL(normalizedPath, baseUrl);

  sourceUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  return targetUrl;
}

function getForwardHeaders(request: Request, body?: string) {
  const headers = new Headers();
  const authorization = request.headers.get('authorization');
  const cookie = request.headers.get('cookie');
  const xRequestId = request.headers.get('x-request-id');

  if (authorization) {
    headers.set('authorization', authorization);
  }
  if (cookie) {
    headers.set('cookie', cookie);
  }
  if (xRequestId) {
    headers.set('x-request-id', xRequestId);
  }
  if (body) {
    headers.set('content-type', 'application/json');
  }

  return headers;
}

function toJsonResponse(payload: unknown, status: number) {
  return NextResponse.json(payload, { status });
}

function buildPassthroughHeaders(upstreamResponse: Response, contentType: string) {
  const headers = new Headers();
  headers.set('content-type', contentType || 'text/plain; charset=utf-8');

  const contentDisposition = upstreamResponse.headers.get('content-disposition');
  if (contentDisposition) {
    headers.set('content-disposition', contentDisposition);
  }

  return headers;
}

function toProxyConfigurationError(errorMessage: string) {
  return NextResponse.json(
    {
      error: {
        code: 'PROXY_CONFIGURATION_ERROR',
        message: errorMessage,
      },
    },
    { status: 500 }
  );
}

function toUpstreamConnectionError() {
  return NextResponse.json(
    {
      error: {
        code: 'UPSTREAM_UNAVAILABLE',
        message: 'Failed to reach backend API.',
      },
    },
    { status: 502 }
  );
}

function toRequestTimeoutError() {
  return NextResponse.json(
    {
      error: {
        code: 'REQUEST_TIMEOUT',
        message: 'Request body read timed out.',
      },
    },
    { status: 408 }
  );
}

function isAbortLikeError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === 'AbortError' ||
    error.name === 'TimeoutError' ||
    /aborted|timeout/i.test(error.message)
  );
}

export async function proxyBackendRequest({
  request,
  upstreamPath,
  method,
}: ProxyOptions) {
  return proxyRequest({
    request,
    upstreamPath,
    method,
    baseUrlResolver: resolveApiBaseUrl,
  });
}

export async function proxyRealtimeRequest({
  request,
  upstreamPath,
  method,
}: ProxyOptions) {
  return proxyRequest({
    request,
    upstreamPath,
    method,
    baseUrlResolver: resolveRealtimeBaseUrl,
  });
}

async function proxyRequest({
  request,
  upstreamPath,
  method,
  baseUrlResolver,
}: ProxyOptions & { baseUrlResolver: () => string }) {
  let targetUrl: URL;

  try {
    targetUrl = createBackendUrl(request, upstreamPath, baseUrlResolver());
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Invalid backend proxy configuration.';
    return toProxyConfigurationError(message);
  }

  let requestBody: string | undefined;
  if (method !== 'GET' && method !== 'DELETE') {
    try {
      const rawBody = await request.text();
      requestBody = rawBody && rawBody.length > 0 ? rawBody : undefined;
    } catch (error) {
      if (isAbortLikeError(error)) {
        return toRequestTimeoutError();
      }
      return toUpstreamConnectionError();
    }
  }

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(targetUrl, {
      method,
      headers: getForwardHeaders(request, requestBody),
      body: requestBody,
      cache: 'no-store',
    });
  } catch {
    return toUpstreamConnectionError();
  }

  const responseText = await upstreamResponse.text();
  if (!responseText) {
    return new NextResponse(null, { status: upstreamResponse.status });
  }

  const contentType = upstreamResponse.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const payload = JSON.parse(responseText);
      return toJsonResponse(payload, upstreamResponse.status);
    } catch {
      return toJsonResponse(
        {
          error: {
            code: 'UPSTREAM_INVALID_JSON',
            message: 'Backend returned invalid JSON payload.',
          },
        },
        502
      );
    }
  }

  return new NextResponse(responseText, {
    status: upstreamResponse.status,
    headers: buildPassthroughHeaders(upstreamResponse, contentType),
  });
}
