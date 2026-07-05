'use client';

/**
 * Singleton Socket.IO client for the racing platform.
 *
 * One connection is shared across all WebSocket hooks so there is no
 * unnecessary socket churn when multiple hooks are mounted on the same page.
 *
 * Usage:
 *   1. Call `initWebSocket(endpoint)` once — e.g. from PlatformProvider on mount.
 *   2. Call `getWebSocket()` inside `useEffect` hooks only — never at module
 *      initialization time, because this module is loaded in server contexts too.
 *
 * The endpoint is supplied by the server at runtime (process.env.WS_ENDPOINT)
 * so it does NOT need to be a NEXT_PUBLIC_ variable baked into the bundle.
 */

import { io, type Socket } from 'socket.io-client';

let _socket: Socket | null = null;
let _endpoint: string | null = null;

/**
 * Set the WebSocket server endpoint before any hook calls `getWebSocket()`.
 * Called once by PlatformProvider with the value read server-side in layout.tsx.
 */
export function initWebSocket(endpoint: string): void {
  const normalizedEndpoint = endpoint.trim().replace(/\/+$/, '');

  if (_endpoint === normalizedEndpoint) return; // idempotent
  if (_socket) {
    // Endpoint changed (hot-reload in dev) — tear down and recreate.
    _socket.disconnect();
    _socket = null;
  }
  _endpoint = normalizedEndpoint;
}

/**
 * Returns the shared Socket.IO instance, creating it on first call.
 * Safe to call multiple times — the same instance is returned.
 *
 * @throws If called outside of a browser context (guards against SSR).
 */
export function getWebSocket(): Socket {
  if (typeof window === 'undefined') {
    throw new Error(
      '[WebSocket] getWebSocket() must only be called in a browser context.'
    );
  }

  if (_socket) {
    return _socket;
  }

  if (!_endpoint) {
    throw new Error(
      '[WebSocket] Missing realtime endpoint. Configure WS_ENDPOINT ' +
        '(or API_BASE_URL as a fallback) before any realtime hooks run.'
    );
  }

  _socket = io(_endpoint, {
    // Do not auto-connect — hooks call .connect() explicitly after attaching
    // listeners so no events are missed.
    autoConnect: false,
    // Keep the default polling->websocket upgrade path, but pin the Socket.IO
    // path explicitly so cross-origin Cloud Run connections do not depend on
    // client-side path inference.
    path: '/socket.io/',
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  _socket.on('connect_error', (error) => {
    console.error(
      `[WebSocket] connect_error to ${_endpoint}: ${error.message}`
    );
  });

  return _socket;
}

/**
 * Tears down the shared socket. Intended for test cleanup only.
 * Do not call this in production page code.
 */
export function destroyWebSocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
  _endpoint = null;
}
