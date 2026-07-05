'use client';

/**
 * useFleetTelemetry
 *
 * Subscribes to the `vehicle.telemetry` WebSocket channel for the entire
 * active fleet. Maintains history and latestTelemetry in the same shape as
 * useMockTelemetryStream so director / overview pages drop in cleanly.
 *
 * - History is accumulated at the configured sample rate and can track the
 *   backend stream up to 25 Hz for short-window graph inspection.
 * - Falls back to empty state (not mock data) when the backend is unavailable.
 * - `isConnected` is exposed so pages can show a disconnected indicator.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getWebSocket } from '@/lib/websocket';
import { createTelemetryHistoryPoint } from '@/lib/director';
import type {
  Car,
  CarTelemetry,
  VehicleTelemetry,
  WsVehicleAnomaly,
} from '@/types';
import type { TelemetryDataPoint } from '@/components/features/TelemetryChart';

interface UseFleetTelemetryOptions {
  cars: Car[];
  maxHistory?: number;
  /**
   * Rate at which raw WS frames are aggregated into a hot history point.
   * Higher values = denser charts. Defaults to 5 Hz.
   */
  sampleRateHz?: number;
  /**
   * Rate at which history / latest snapshots are published to React state.
   * Capped to `sampleRateHz`. Lowering this decouples chart density from
   * React render frequency — at 25 Hz acquisition × 10 Hz publish you still
   * get every sample, batched 2-3 per render. Defaults to 10 Hz.
   */
  publishRateHz?: number;
}

interface UseFleetTelemetryResult {
  history: TelemetryDataPoint[];
  latestTelemetry: CarTelemetry[];
  /** Backend-computed per-vehicle anomaly summaries keyed by vehicleId. Updated at 1 Hz. */
  latestAnomalies: Map<number, WsVehicleAnomaly>;
  /** Clear the locally-cached anomaly display. Backend continues accumulating. */
  resetAnomalies: () => void;
  /** Clears buffered frames and history cache to reduce memory pressure. */
  clearCache: () => void;
  isConnected: boolean;
}

/**
 * Map a WS VehicleTelemetry frame to the CarTelemetry shape expected by
 * director utilities. Fields absent from VehicleTelemetry default to 0.
 */
function wsTelemetryToCarTelemetry(
  data: VehicleTelemetry,
  car: Car,
  distance: number
): CarTelemetry {
  return {
    id: data.vehicleId,
    number: car.number,
    lap: 0,
    speed: data.speed,
    rpm: data.rpm,
    fuelFlow: 0,
    fuelPressure: data.fuelPressure,
    boost: data.boost,
    throttle: data.throttle,
    brake: data.brake,
    gLat: data.gLat,
    gLong: data.gLong,
    ignitionTiming: data.ignitionTiming,
    lambda: data.lambda,
    airflow: data.airflow,
    distance,
  };
}

export function useFleetTelemetry({
  cars,
  maxHistory = 600,
  sampleRateHz = 5,
  publishRateHz = 10,
}: UseFleetTelemetryOptions): UseFleetTelemetryResult {
  const [history, setHistory] = useState<TelemetryDataPoint[]>([]);
  const [latestPerCar, setLatestPerCar] = useState<Map<number, CarTelemetry>>(
    new Map()
  );
  const [isConnected, setIsConnected] = useState(false);
  const [latestAnomalies, setLatestAnomalies] = useState<
    Map<number, WsVehicleAnomaly>
  >(new Map());
  const tickRef = useRef(0);
  // Stable ref so the accumulation interval reads the latest Map without
  // needing to be in its dependency array.
  const latestPerCarRef = useRef<Map<number, CarTelemetry>>(new Map());
  // Incoming WS frames are buffered into this ref and flushed at sampleRateHz
  // to prevent a setState per frame when many vehicles broadcast simultaneously.
  const pendingFramesRef = useRef<Map<number, CarTelemetry>>(new Map());
  // Anomaly frames are also buffered to prevent 30 setState calls/sec
  // when the fleet size scales (1 Hz × N vehicles = N setState calls without buffering).
  const pendingAnomalyRef = useRef<Map<number, WsVehicleAnomaly>>(new Map());
  // Hot history buffer. Accumulates at sampleRateHz (no setState),
  // then a slower publication interval flushes the latest tail to React.
  const historyBufferRef = useRef<TelemetryDataPoint[]>([]);
  // Dirty flags so the publish loop skips work when nothing changed.
  const historyDirtyRef = useRef(false);
  const latestDirtyRef = useRef(false);
  const anomaliesDirtyRef = useRef(false);

  // ── Acquisition interval ──────────────────────────────────────────────
  // Runs at sampleRateHz. NEVER calls setState — only updates refs. This is
  // what controls chart density. At 25 Hz × 30 cars this would otherwise
  // produce 25 React renders/sec of the entire dashboard tree.
  useEffect(() => {
    const sampleIntervalMs = Math.max(20, Math.round(1000 / sampleRateHz));
    const interval = setInterval(() => {
      // Apply buffered WS frames into the ref-backed latest map.
      if (pendingFramesRef.current.size > 0) {
        const pending = pendingFramesRef.current;
        pendingFramesRef.current = new Map();
        const next = new Map(latestPerCarRef.current);
        pending.forEach((v, k) => next.set(k, v));
        latestPerCarRef.current = next;
        latestDirtyRef.current = true;
      }

      // Apply buffered anomaly frames to a ref store; published below.
      if (pendingAnomalyRef.current.size > 0) {
        anomaliesDirtyRef.current = true;
      }

      const current = latestPerCarRef.current;
      if (current.size === 0) return;
      tickRef.current += 1;
      const batch = Array.from(current.values());
      const point = createTelemetryHistoryPoint(batch, tickRef.current);

      // Append to hot buffer in-place (cheap), trim from the head if over cap.
      const buf = historyBufferRef.current;
      buf.push(point);
      if (buf.length > maxHistory) {
        buf.splice(0, buf.length - maxHistory);
      }
      historyDirtyRef.current = true;
    }, sampleIntervalMs);
    return () => clearInterval(interval);
  }, [maxHistory, sampleRateHz]);

  // ── Publication interval ──────────────────────────────────────────────
  // Runs at min(sampleRateHz, publishRateHz). Cheap when nothing is dirty.
  // Caps React render frequency for downstream consumers; charts still get
  // every accumulated sample, batched 2-3 per render at 25 Hz / 10 Hz.
  useEffect(() => {
    const effectivePublishHz = Math.min(sampleRateHz, publishRateHz);
    const publishIntervalMs = Math.max(
      20,
      Math.round(1000 / effectivePublishHz)
    );
    const interval = setInterval(() => {
      if (historyDirtyRef.current) {
        historyDirtyRef.current = false;
        // Snapshot the buffer (shallow copy of refs only — fast).
        setHistory(historyBufferRef.current.slice());
      }
      if (latestDirtyRef.current) {
        latestDirtyRef.current = false;
        setLatestPerCar(latestPerCarRef.current);
      }
      if (anomaliesDirtyRef.current) {
        anomaliesDirtyRef.current = false;
        const pending = pendingAnomalyRef.current;
        pendingAnomalyRef.current = new Map();
        setLatestAnomalies((prev) => {
          const next = new Map(prev);
          pending.forEach((v, k) => next.set(k, v));
          return next;
        });
      }
    }, publishIntervalMs);
    return () => clearInterval(interval);
  }, [sampleRateHz, publishRateHz]);

  // WebSocket subscription — re-runs when the cars list changes.
  useEffect(() => {
    if (cars.length === 0) return;

    let socket: ReturnType<typeof getWebSocket>;
    try {
      socket = getWebSocket();
    } catch {
      // SSR guard — no-op on the server.
      return;
    }

    const carMap = new Map(cars.map((c) => [c.id, c]));
    // Fleet subscriptions — no vehicleId means receive frames for all vehicles.
    const subscribePayload = { channel: 'vehicle.telemetry' as const };
    const anomalySubPayload = { channel: 'vehicle.anomaly' as const };

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('subscribe', subscribePayload);
      socket.emit('subscribe', anomalySubPayload);
    };

    const handleDisconnect = () => setIsConnected(false);

    const handleTelemetry = (data: VehicleTelemetry) => {
      const car = carMap.get(data.vehicleId);
      if (!car) return;

      const nextDistance =
        typeof data.distanceMeters === 'number'
          ? data.distanceMeters
          : (latestPerCarRef.current.get(data.vehicleId)?.distance ?? 0);

      const carTelemetry = wsTelemetryToCarTelemetry(data, car, nextDistance);
      // Buffer into ref — flushed at the configured sample rate.
      pendingFramesRef.current.set(data.vehicleId, carTelemetry);
    };

    // Each frame is the full backend-computed summary — buffer into ref.
    // Flushed at the sample rate alongside telemetry to avoid 30 setState/sec.
    const handleAnomaly = (data: WsVehicleAnomaly) => {
      pendingAnomalyRef.current.set(data.vehicleId, data);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('vehicle.telemetry', handleTelemetry);
    socket.on('vehicle.anomaly', handleAnomaly);

    if (socket.connected) {
      queueMicrotask(() => setIsConnected(true));
      socket.emit('subscribe', subscribePayload);
      socket.emit('subscribe', anomalySubPayload);
    } else {
      socket.connect();
    }

    return () => {
      socket.emit('unsubscribe', subscribePayload);
      socket.emit('unsubscribe', anomalySubPayload);
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('vehicle.telemetry', handleTelemetry);
      socket.off('vehicle.anomaly', handleAnomaly);
    };
  }, [cars]);

  // Stable reference — only recreates when latestPerCar state actually changes,
  // not on every render. This prevents useEffect loops in consumers like
  // overview-director that call setState in response to telemetry changes.
  const latestTelemetry = useMemo(
    () => Array.from(latestPerCar.values()),
    [latestPerCar]
  );

  const resetAnomalies = useCallback(() => setLatestAnomalies(new Map()), []);
  const clearCache = useCallback(() => {
    pendingFramesRef.current.clear();
    pendingAnomalyRef.current.clear();
    historyBufferRef.current = [];
    latestPerCarRef.current = new Map();
    historyDirtyRef.current = false;
    latestDirtyRef.current = false;
    anomaliesDirtyRef.current = false;
    setHistory([]);
    setLatestPerCar(new Map());
    tickRef.current = 0;
  }, []);

  return {
    history,
    latestTelemetry,
    latestAnomalies,
    resetAnomalies,
    clearCache,
    isConnected,
  };
}
