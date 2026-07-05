'use client';

/**
 * useFleetLocation
 *
 * Subscribes to the `vehicle.location` WebSocket channel for the entire
 * active fleet (no vehicleId filter = all vehicles). Provides the latest
 * GPS / track-position frame for every car.
 *
 * Use this hook wherever the MapWidget needs rival / main-car progress —
 * location data should not be sourced from the `vehicle.telemetry` channel.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { getWebSocket } from '@/lib/websocket';
import type { Car, VehicleLocation } from '@/types';

interface UseFleetLocationOptions {
  cars: Car[];
}

interface UseFleetLocationResult {
  latestLocations: VehicleLocation[];
  isConnected: boolean;
}

export function useFleetLocation({
  cars,
}: UseFleetLocationOptions): UseFleetLocationResult {
  const [latestPerCar, setLatestPerCar] = useState<
    Map<number, VehicleLocation>
  >(new Map());
  const [isConnected, setIsConnected] = useState(false);
  // Incoming WS frames are buffered into this ref and flushed at 5 Hz to
  // avoid one setState per frame when every vehicle broadcasts at once.
  const pendingFramesRef = useRef<Map<number, VehicleLocation>>(new Map());

  useEffect(() => {
    const interval = setInterval(() => {
      if (pendingFramesRef.current.size === 0) return;
      const pending = new Map(pendingFramesRef.current);
      pendingFramesRef.current.clear();
      setLatestPerCar((prev) => {
        const next = new Map(prev);
        pending.forEach((v, k) => next.set(k, v));
        return next;
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (cars.length === 0) return;

    let socket: ReturnType<typeof getWebSocket>;
    try {
      socket = getWebSocket();
    } catch {
      // SSR guard — no-op on the server.
      return;
    }

    const carIdSet = new Set(cars.map((c) => c.id));
    const subscribePayload = { channel: 'vehicle.location' as const };

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('subscribe', subscribePayload);
    };

    const handleDisconnect = () => setIsConnected(false);

    const handleLocation = (data: VehicleLocation) => {
      if (!carIdSet.has(data.vehicleId)) return;
      pendingFramesRef.current.set(data.vehicleId, data);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('vehicle.location', handleLocation);

    if (socket.connected) {
      queueMicrotask(() => setIsConnected(true));
      socket.emit('subscribe', subscribePayload);
    } else {
      socket.connect();
    }

    return () => {
      socket.emit('unsubscribe', subscribePayload);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('vehicle.location', handleLocation);
    };
  }, [cars]);

  const latestLocations = useMemo(
    () => Array.from(latestPerCar.values()),
    [latestPerCar]
  );

  return { latestLocations, isConnected };
}
