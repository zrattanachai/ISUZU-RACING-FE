'use client';

/**
 * useRaceControlSnapshot
 *
 * Loads the initial REST snapshot for the Race Control (main) page for a
 * given vehicle. Returns sensor categories, connection state, and alerts.
 *
 * Realtime updates after the initial load are delivered via WebSocket
 * (useVehicleTelemetry, useVehicleAlerts). This hook is only for the
 * first-paint data load.
 *
 * Calls: GET /api/race-control/cars/{carId}/snapshot
 */

import { useCallback, useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/authClient';
import type { Car, Driver } from '@/types';
import type {
  SensorCategoryKey,
  SensorDefinition,
  SensorStatus,
  SystemAlert,
} from '@/types/dashboard';

interface ConnectionStatus {
  state: 'synchronized' | 'degraded' | 'offline';
  latencyMs: number;
  boxName?: string;
  firmwareVersion?: string;
}

export interface RaceControlSnapshot {
  car: Car;
  driver: Driver;
  sensorCategories: Record<SensorCategoryKey, SensorDefinition[]>;
  alerts: SystemAlert[];
  connection: ConnectionStatus;
}

interface ApiSensorReading {
  name: string;
  value: string;
  status: SensorStatus;
  channel: string;
}

interface ApiAlert {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  time: string;
  acknowledged: boolean;
}

interface ApiSnapshotPayload {
  car?: Car;
  driver?: Driver;
  sensorCategories?: Record<SensorCategoryKey, ApiSensorReading[]>;
  alerts?: ApiAlert[];
  connection?: ConnectionStatus;
}

const toDisplayTime = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleTimeString([], {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
};

interface UseRaceControlSnapshotResult {
  snapshot: RaceControlSnapshot | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
}

export function useRaceControlSnapshot(
  carId: number | null
): UseRaceControlSnapshotResult {
  const [snapshot, setSnapshot] = useState<RaceControlSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!carId || carId <= 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetchWithAuth(
        `/api/race-control/cars/${carId}/snapshot`,
        {
          cache: 'no-store',
        }
      );

      if (res.status === 401) {
        setError('UNAUTHORIZED');
        return;
      }
      if (!res.ok) {
        setError(`HTTP ${res.status}`);
        return;
      }

      const payload = (await res.json()) as ApiSnapshotPayload;

      if (!payload.car || !payload.driver) {
        setError('Invalid snapshot response.');
        return;
      }

      const alerts: SystemAlert[] = (payload.alerts ?? []).map((a) => ({
        msg: a.message,
        time: toDisplayTime(a.time),
        severity: a.severity,
      }));

      setSnapshot({
        car: payload.car,
        driver: payload.driver,
        sensorCategories: payload.sensorCategories ?? {
          POWERTRAIN: [],
          CHASSIS: [],
          AERO: [],
          ELECTRONICS: [],
        },
        alerts,
        connection: payload.connection ?? {
          state: 'offline',
          latencyMs: 0,
        },
      });
    } catch {
      setError('Failed to load snapshot.');
    } finally {
      setIsLoading(false);
    }
  }, [carId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { snapshot, isLoading, error, reload: load };
}
