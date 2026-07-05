/**
 * alertThresholdService
 *
 * REST client for reading and updating alert threshold configuration.
 * These thresholds are configured in the Settings page and consumed by all
 * sensor/telemetry pages to highlight out-of-bounds values.
 */

import type { AlertThreshold } from '@/types';
import { fetchWithAuth } from '@/lib/authClient';

/**
 * Fetch all alert threshold definitions from the backend.
 */
export async function fetchAlertThresholds(): Promise<AlertThreshold[]> {
  const res = await fetchWithAuth('/api/alert-thresholds', {
    cache: 'no-store',
  });

  if (res.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(body.error?.message ?? `HTTP ${res.status}`);
  }

  const payload = (await res.json()) as { thresholds: AlertThreshold[] };
  return payload.thresholds;
}

/**
 * Persist updated alert thresholds.
 * Replaces the full threshold set — send all thresholds, not just changed ones.
 */
export async function updateAlertThresholds(
  thresholds: AlertThreshold[]
): Promise<void> {
  const res = await fetchWithAuth('/api/alert-thresholds', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thresholds }),
  });

  if (res.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw new Error(body.error?.message ?? `HTTP ${res.status}`);
  }
}
