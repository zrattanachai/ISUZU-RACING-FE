/**
 * administrationService
 *
 * REST client for Administration page entities:
 * events, users, garages, and vehicles.
 *
 * All mutations go through Next.js route handlers which proxy to the backend
 * with the server-side API_BASE_URL — secrets never hit the browser.
 */

import type {
  AdminUser,
  Car,
  DirectorRefreshRateResponse,
  Garage,
  RaceEvent,
  DirectorThresholdsConfig,
  DirectorThresholdsResponse,
} from '@/types';
import { fetchWithAuth } from '@/lib/authClient';

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export async function fetchEvents(): Promise<RaceEvent[]> {
  const res = await fetchWithAuth('/api/administration/events', {
    cache: 'no-store',
  });
  await assertOk(res);
  const payload = (await res.json()) as { events: RaceEvent[] };
  return payload.events;
}

export async function createEvent(
  event: Omit<RaceEvent, 'id'>
): Promise<RaceEvent> {
  const res = await fetchWithAuth('/api/administration/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  await assertOk(res);
  return res.json() as Promise<RaceEvent>;
}

export async function updateEvent(
  id: string,
  patch: Partial<Omit<RaceEvent, 'id'>>
): Promise<RaceEvent> {
  const res = await fetchWithAuth(
    `/api/administration/events/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }
  );
  await assertOk(res);
  return res.json() as Promise<RaceEvent>;
}

export async function deleteEvent(id: string): Promise<void> {
  const res = await fetchWithAuth(
    `/api/administration/events/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    }
  );
  await assertOk(res);
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function fetchUsers(): Promise<AdminUser[]> {
  const res = await fetchWithAuth('/api/administration/users', {
    cache: 'no-store',
  });
  await assertOk(res);
  const payload = (await res.json()) as { users: AdminUser[] };
  return payload.users;
}

// ---------------------------------------------------------------------------
// Garages
// ---------------------------------------------------------------------------

export async function fetchGarages(): Promise<Garage[]> {
  const res = await fetchWithAuth('/api/administration/garages', {
    cache: 'no-store',
  });
  await assertOk(res);
  const payload = (await res.json()) as { garages: Garage[] };
  return payload.garages;
}

export async function createGarage(
  garage: Omit<Garage, 'id'>
): Promise<Garage> {
  const res = await fetchWithAuth('/api/administration/garages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(garage),
  });
  await assertOk(res);
  return res.json() as Promise<Garage>;
}

export async function deleteGarage(id: string): Promise<void> {
  const res = await fetchWithAuth(
    `/api/administration/garages/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    }
  );
  await assertOk(res);
}

// ---------------------------------------------------------------------------
// Vehicles (admin CRUD — extends the read-only /fleet endpoint)
// ---------------------------------------------------------------------------

export async function fetchVehicles(): Promise<Car[]> {
  const res = await fetchWithAuth('/api/administration/vehicles', {
    cache: 'no-store',
  });
  await assertOk(res);
  const payload = (await res.json()) as { vehicles: Car[] };
  return payload.vehicles;
}

export async function createVehicle(vehicle: Omit<Car, 'id'>): Promise<Car> {
  const res = await fetchWithAuth('/api/administration/vehicles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vehicle),
  });
  await assertOk(res);
  return res.json() as Promise<Car>;
}

export async function updateVehicle(
  id: number,
  patch: Partial<Omit<Car, 'id'>>
): Promise<Car> {
  const res = await fetchWithAuth(`/api/administration/vehicles/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  await assertOk(res);
  return res.json() as Promise<Car>;
}

export async function deleteVehicle(id: number): Promise<void> {
  const res = await fetchWithAuth(`/api/administration/vehicles/${id}`, {
    method: 'DELETE',
  });
  await assertOk(res);
}

// ---------------------------------------------------------------------------
// Director anomaly thresholds (/api/director/thresholds)
// ---------------------------------------------------------------------------

/**
 * Fetch the current director anomaly threshold config from the backend.
 * The backend anomaly engine uses these values — do NOT fall back to client-side defaults.
 */
export async function fetchDirectorThresholds(): Promise<DirectorThresholdsConfig> {
  const res = await fetchWithAuth('/api/director/thresholds', {
    cache: 'no-store',
  });
  await assertOk(res);
  const payload = (await res.json()) as DirectorThresholdsResponse;
  return payload.thresholds;
}

/**
 * Replace the full director anomaly threshold config.
 * The backend engine applies new values on the next evaluation cycle.
 */
export async function updateDirectorThresholds(
  thresholds: DirectorThresholdsConfig
): Promise<{ saved: boolean; updatedAt?: string }> {
  const res = await fetchWithAuth('/api/director/thresholds', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ thresholds }),
  });
  await assertOk(res);
  return res.json() as Promise<{ saved: boolean; updatedAt?: string }>;
}

export async function fetchDirectorRefreshRate(): Promise<number> {
  const res = await fetchWithAuth('/api/director/refresh-rate', {
    cache: 'no-store',
  });
  await assertOk(res);
  const payload = (await res.json()) as DirectorRefreshRateResponse;
  return payload.refreshRateHz;
}

export async function updateDirectorRefreshRate(
  refreshRateHz: number
): Promise<{ saved: boolean; updatedAt?: string }> {
  const res = await fetchWithAuth('/api/director/refresh-rate', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshRateHz }),
  });
  await assertOk(res);
  return res.json() as Promise<{ saved: boolean; updatedAt?: string }>;
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

async function assertOk(res: Response): Promise<void> {
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
