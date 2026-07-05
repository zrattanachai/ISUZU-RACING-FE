/**
 * recordingService
 *
 * REST client for the recording system used by the Files & Video page.
 * Engineers trigger a recording from the Engineering page (start/stop dates),
 * and this service persists the session and polls its processing status.
 */

import type {
  CreateRecordingRequest,
  CreateScopedRecordingRequest,
  RecordingDownloadResponse,
  RecordingSession,
} from '@/types';
import { fetchWithAuth } from '@/lib/authClient';

async function parseErrorMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
  };
  return body.error?.message ?? `HTTP ${response.status}`;
}

/** Create a new recording session. Returns the created session. */
export async function createRecording(
  request: CreateRecordingRequest
): Promise<RecordingSession> {
  const res = await fetchWithAuth('/api/recordings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (res.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  return res.json() as Promise<RecordingSession>;
}

/**
 * Create a recording for a specific vehicle. The car id comes from the route
 * path so Files & Video can later discover the same session through
 * GET /recordings.
 */
export async function createCarRecording(
  carId: number,
  request: CreateScopedRecordingRequest
): Promise<RecordingSession> {
  const res = await fetchWithAuth(`/api/engineering/cars/${carId}/recordings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (res.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  return res.json() as Promise<RecordingSession>;
}

/** Fetch all recording sessions. Supports optional vehicleId filter. */
export async function fetchRecordings(
  vehicleId?: number
): Promise<RecordingSession[]> {
  const url = new URL('/api/recordings', window.location.origin);
  if (vehicleId !== undefined) {
    url.searchParams.set('vehicleId', vehicleId.toString());
  }

  const res = await fetchWithAuth(url.toString(), {
    cache: 'no-store',
  });

  if (res.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  const payload = (await res.json()) as { recordings: RecordingSession[] };
  return payload.recordings;
}

/**
 * Resolve the storage URL for a completed recording.
 * The backend owns file generation and storage placement.
 */
export async function fetchRecordingDownload(
  recordingId: string
): Promise<RecordingDownloadResponse> {
  const res = await fetchWithAuth(
    `/api/recordings/${encodeURIComponent(recordingId)}/download`,
    { cache: 'no-store' }
  );

  if (res.status === 401) {
    throw new Error('UNAUTHORIZED');
  }
  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  return res.json() as Promise<RecordingDownloadResponse>;
}
