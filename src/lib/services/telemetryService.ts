/**
 * telemetryService
 *
 * REST client for historical telemetry queries.
 * All historical data goes through the `/api/telemetry` route handler which
 * proxies to the backend; realtime telemetry is delivered via WebSocket.
 */

import type { VehicleTelemetry } from '@/types';
import { fetchWithAuth } from '@/lib/authClient';

export interface TelemetryHistoryParams {
  vehicleId: number;
  startDate: string; // ISO-8601
  endDate: string; // ISO-8601
  /** Maximum number of data points to return (default: 1000). */
  limit?: number;
}

export interface TelemetryHistoryResponse {
  vehicleId: number;
  points: VehicleTelemetry[];
}

/**
 * Fetch historical telemetry frames for a vehicle within a date range.
 * Intended for the Director page lap comparison and the Files page exports.
 */
export async function fetchTelemetryHistory(
  params: TelemetryHistoryParams
): Promise<TelemetryHistoryResponse> {
  const url = new URL('/api/telemetry/history', window.location.origin);
  url.searchParams.set('vehicleId', params.vehicleId.toString());
  url.searchParams.set('startDate', params.startDate);
  url.searchParams.set('endDate', params.endDate);
  if (params.limit !== undefined) {
    url.searchParams.set('limit', params.limit.toString());
  }

  const res = await fetchWithAuth(url.toString(), { cache: 'no-store' });

  if (res.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(body.error?.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<TelemetryHistoryResponse>;
}
