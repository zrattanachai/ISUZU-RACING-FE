import { useEffect, useState } from 'react';

import type { TelemetryDataPoint } from '@/components/features/TelemetryChart';
import {
  createTelemetryHistoryPoint,
  generateTelemetryBatch,
} from '@/lib/director';
import type { Car, CarTelemetry } from '@/types';

interface UseMockTelemetryStreamOptions {
  cars: Car[];
  intervalMs: number;
  maxHistory?: number;
  progressStep?: number;
}

export function useMockTelemetryStream({
  cars,
  intervalMs,
  maxHistory = 600,
  progressStep = 0,
}: UseMockTelemetryStreamOptions) {
  const [history, setHistory] = useState<TelemetryDataPoint[]>([]);
  const [latestTelemetry, setLatestTelemetry] = useState<CarTelemetry[]>([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let tick = 0;
    const safeIntervalMs = Math.max(intervalMs, 200); // max 5 updates per second to prevent overload

    const interval = setInterval(() => {
      tick += 1;

      const telemetryBatch = generateTelemetryBatch(cars, tick);
      const historyPoint = createTelemetryHistoryPoint(telemetryBatch, tick);

      setLatestTelemetry(telemetryBatch);
      setHistory((previous) => [
        ...previous.slice(-(maxHistory - 1)),
        historyPoint,
      ]);

      if (progressStep > 0) {
        setProgress((current) => (current + progressStep) % 1);
      }
    }, safeIntervalMs);

    return () => clearInterval(interval);
  }, [cars, intervalMs, maxHistory, progressStep]);

  return {
    history,
    latestTelemetry,
    progress,
  };
}
