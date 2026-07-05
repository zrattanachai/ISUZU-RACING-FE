'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchWithAuth } from '@/lib/authClient';
import { getWebSocket } from '@/lib/websocket';
import type { VehicleAlert, WsSubscribePayload } from '@/types';
import type { SystemAlert } from '@/types/dashboard';

interface ApiAlert {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  time: string;
  acknowledged: boolean;
}

const toDisplayTime = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleTimeString([], {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export function useCarAlerts(activeCarId: number) {
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [alertIds, setAlertIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Tracks IDs already in state to deduplicate WS pushes vs REST load.
  const seenIds = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    if (activeCarId <= 0) {
      setAlertIds([]);
      setAlerts([]);
      seenIds.current.clear();
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetchWithAuth(
        `/api/cars/${activeCarId}/alerts?state=active`,
        { cache: 'no-store' }
      );

      if (!response.ok) {
        throw new Error('Failed to load alerts');
      }

      const payload = (await response.json()) as { alerts?: ApiAlert[] };
      const nextAlerts = Array.isArray(payload.alerts) ? payload.alerts : [];

      seenIds.current = new Set(nextAlerts.map((a) => a.id));
      setAlertIds(nextAlerts.map((a) => a.id));
      setAlerts(
        nextAlerts.map((a) => ({
          msg: a.message,
          time: toDisplayTime(a.time),
          severity: a.severity,
        }))
      );
    } catch {
      setAlertIds([]);
      setAlerts([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeCarId]);

  // Initial REST load for first-paint.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Live WS subscription — pushes new alerts without polling.
  useEffect(() => {
    if (activeCarId <= 0) return;

    let socket: ReturnType<typeof getWebSocket>;
    try {
      socket = getWebSocket();
    } catch {
      return;
    }

    const subscribePayload: WsSubscribePayload = {
      channel: 'vehicle.alert',
      vehicleId: activeCarId,
    };

    const handleAlert = (data: VehicleAlert) => {
      if (data.vehicleId !== activeCarId) return;
      if (seenIds.current.has(data.alertId)) return;
      seenIds.current.add(data.alertId);
      setAlertIds((prev) => [data.alertId, ...prev]);
      setAlerts((prev) => [
        {
          msg: data.message,
          time: toDisplayTime(data.timestamp),
          severity: data.severity,
        },
        ...prev,
      ]);
    };

    const handleConnect = () => {
      socket.emit('subscribe', subscribePayload);
    };

    socket.on('connect', handleConnect);
    socket.on('vehicle.alert', handleAlert);

    if (socket.connected) {
      socket.emit('subscribe', subscribePayload);
    } else {
      socket.connect();
    }

    return () => {
      socket.emit('unsubscribe', subscribePayload);
      socket.off('connect', handleConnect);
      socket.off('vehicle.alert', handleAlert);
    };
  }, [activeCarId]);

  return {
    alerts,
    alertIds,
    isLoading,
    refresh,
  };
}
