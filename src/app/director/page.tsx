'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { flushSync } from 'react-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { EngineeringFooter } from '@/components/features/EngineeringFooter';
import { SaveRecordingModal } from '@/components/features/SaveRecordingModal';
import { AccessDeniedState } from '@/components/common/AccessDeniedState';
import { usePlatform } from '@/context/PlatformContext';
import { useFleetTelemetry } from '@/hooks/useFleetTelemetry';
import { useFleetLocation } from '@/hooks/useFleetLocation';
import { useVehicleStatus } from '@/hooks/useVehicleStatus';
import { useRecording } from '@/hooks/useRecording';
import {
  DIRECTOR_METRICS,
  FULL_SESSION_WINDOW,
  type DirectorMetricKey,
} from '@/lib/director';
import { canAccessRoute } from '@/lib/navigationAccess';
import { updateDirectorThresholds } from '@/lib/services/administrationService';
import { fetchTelemetryHistory } from '@/lib/services/telemetryService';
import type {
  DirectorThresholdsConfig,
  VehicleLocation,
  VehicleTelemetry,
} from '@/types';
import { DirectorToolbar } from './DirectorToolbar';
import { DirectorMetricRow } from './DirectorMetricRow';
import { DirectorRightPanel } from './DirectorRightPanel';
import { DirectorBreachLog } from './DirectorBreachLog';
import type { TelemetryDataPoint } from '@/components/features/TelemetryChart';
import {
  type RaceStatus,
  type RightPanelPage,
  type BreachAlert,
  type MetricRuntimeRule,
  type DisplayCar,
  DEFAULT_METRIC_RULE,
} from './types';

const VIOLATION_HIGHLIGHT_MS = (() => {
  const raw = process.env.NEXT_PUBLIC_VIOLATION_HIGHLIGHT_MS;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3000;
})();

const DIRECTOR_STREAM_HZ = 25;

function compactGraphPoints(
  data: TelemetryDataPoint[],
  maxPoints: number
): TelemetryDataPoint[] {
  if (!Array.isArray(data)) return [];
  if (data.length <= maxPoints) return data;

  const stride = Math.ceil(data.length / maxPoints);
  return data.filter(
    (_, index) => index === data.length - 1 || index % stride === 0
  );
}

function buildReplayHistory(
  byCar: Map<number, VehicleTelemetry[]>
): TelemetryDataPoint[] {
  const byTimestamp = new Map<number, TelemetryDataPoint>();

  byCar.forEach((frames, carId) => {
    frames.forEach((frame) => {
      const ts = Date.parse(frame.timestamp);
      if (!Number.isFinite(ts)) return;

      const existing = byTimestamp.get(ts) ?? {
        time: new Date(ts).toLocaleTimeString([], {
          hour12: false,
          minute: '2-digit',
          second: '2-digit',
        }),
        tick: 0,
        sourceTs: ts,
      };

      existing[`speed_${carId}`] = frame.speed;
      existing[`rpm_${carId}`] = frame.rpm;
      existing[`boost_${carId}`] = frame.boost;
      existing[`lambda_${carId}`] = frame.lambda;
      existing[`gLat_${carId}`] = frame.gLat;
      existing[`gLong_${carId}`] = frame.gLong;
      existing[`throttle_${carId}`] = frame.throttle;
      existing[`brake_${carId}`] = frame.brake;
      if (typeof frame.distanceMeters === 'number') {
        existing[`distance_${carId}`] = frame.distanceMeters;
      }

      byTimestamp.set(ts, existing);
    });
  });

  return Array.from(byTimestamp.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, point], index) => ({ ...point, tick: index + 1 }));
}

function mergeHistoryBySourceTs(
  coldHistory: TelemetryDataPoint[],
  hotHistory: TelemetryDataPoint[]
): TelemetryDataPoint[] {
  if (coldHistory.length === 0) return hotHistory;
  if (hotHistory.length === 0) return coldHistory;

  const byTs = new Map<number, TelemetryDataPoint>();
  const untimed: TelemetryDataPoint[] = [];

  [...coldHistory, ...hotHistory].forEach((point) => {
    const ts = point.sourceTs;
    if (typeof ts === 'number' && Number.isFinite(ts)) {
      byTs.set(ts, { ...(byTs.get(ts) ?? {}), ...point });
      return;
    }
    untimed.push(point);
  });

  const timed = Array.from(byTs.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, point]) => point);

  return [...untimed, ...timed].map((point, index) => ({
    ...point,
    tick: index + 1,
  }));
}

function buildIncidentPoint(alert: BreachAlert): TelemetryDataPoint {
  return {
    time: alert.timestamp,
    tick: alert.tick,
    sourceTs: alert.sourceTs,
    [`speed_${alert.carId}`]: alert.snapshot.speed,
    [`rpm_${alert.carId}`]: alert.snapshot.rpm,
    [`boost_${alert.carId}`]: alert.snapshot.boost,
    [`lambda_${alert.carId}`]: alert.snapshot.lambda,
    [`gLat_${alert.carId}`]: alert.snapshot.gLat,
    [`gLong_${alert.carId}`]: alert.snapshot.gLong,
    [`throttle_${alert.carId}`]: alert.snapshot.throttle,
    [`brake_${alert.carId}`]: alert.snapshot.brake,
    [`distance_${alert.carId}`]: alert.snapshot.distance,
  };
}

export default function DirectorPage() {
  const {
    cars,
    thresholds,
    setThresholds,
    activeCarId,
    setActiveCarId,
    currentRole,
    currentUser,
  } = usePlatform();

  const [visibleWindowSecs, setVisibleWindowSecs] = useState(60);
  const [activeMetricKeys, setActiveMetricKeys] = useState<DirectorMetricKey[]>(
    ['boost', 'speed', 'rpm', 'lambda', 'gLat']
  );
  const [selectedCarIds, setSelectedCarIds] = useState<number[]>(
    activeCarId ? [activeCarId] : cars[0] ? [cars[0].id] : []
  );
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareDataMode, setCompareDataMode] = useState<'LIVE' | 'LAP'>(
    'LIVE'
  );
  const [selectedCompareLap, setSelectedCompareLap] = useState(1);
  const [openSettingsKey, setOpenSettingsKey] = useState<string | null>(null);
  const [raceStatus, setRaceStatus] = useState<RaceStatus>('GREEN');
  const [rightPanelPage, setRightPanelPage] = useState<RightPanelPage>('MAP');
  const [alerts, setAlerts] = useState<BreachAlert[]>([]);
  const [filterSelectedOnly, setFilterSelectedOnly] = useState(false);
  const [thresholdSaveStatus, setThresholdSaveStatus] = useState<
    'idle' | 'saved' | 'error'
  >('idle');
  const [isSavingThresholds, setIsSavingThresholds] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [replayHistory, setReplayHistory] = useState<TelemetryDataPoint[]>([]);
  const [pausedFleetLocations, setPausedFleetLocations] = useState<
    VehicleLocation[]
  >([]);
  const [metricRules, setMetricRules] = useState<
    Record<string, MetricRuntimeRule>
  >(() =>
    DIRECTOR_METRICS.reduce<Record<string, MetricRuntimeRule>>((acc, m) => {
      acc[m.key] = { ...DEFAULT_METRIC_RULE };
      return acc;
    }, {})
  );

  const breachStartedAtRef = useRef<Record<string, number>>({});
  const breachCountsRef = useRef<Record<string, number>>({});
  const replayRefreshTimerRef = useRef<number | null>(null);
  const isReplayLoadingRef = useRef(false);
  const skipNextAutoReplayFetchRef = useRef(false);
  const incidentReplayLockedRef = useRef(false);
  const playbackAnchorTsRef = useRef<number | null>(null);
  const manualPlaybackIndexRef = useRef<number | null>(null);
  const manualPlaybackRatioRef = useRef<number | null>(null);
  const previousViolationTotalsRef = useRef<Map<number, number>>(new Map());
  const previousAnomalyTotalsRef = useRef<Map<number, number>>(new Map());
  const hasViolationBaselineRef = useRef(false);
  const [violationFlashUntilByCar, setViolationFlashUntilByCar] = useState<
    Map<number, number>
  >(new Map());
  const [anomalyFlashUntilByCar, setAnomalyFlashUntilByCar] = useState<
    Map<number, number>
  >(new Map());
  const safeCars = useMemo(() => (Array.isArray(cars) ? cars : []), [cars]);
  const safeSelectedCarIds = useMemo(
    () => (Array.isArray(selectedCarIds) ? selectedCarIds : []),
    [selectedCarIds]
  );
  const safeAlerts = useMemo(
    () => (Array.isArray(alerts) ? alerts : []),
    [alerts]
  );
  const selectedPrimaryCarId = safeSelectedCarIds[0] ?? 0;
  const isCompetitor = currentRole === 'COMPETITOR';

  const isFullWindow = visibleWindowSecs === FULL_SESSION_WINDOW;
  // Keep acquisition fixed at the backend's 25 Hz director stream. Window
  // controls should change the visible slice only, not slow the live buffer.
  const chartHz = DIRECTOR_STREAM_HZ;
  // Hot buffer is sized for the longest non-FULL inspection window (1 min)
  // plus headroom. FULL view reads from the cold (downsampled) buffer instead.
  const visibleWindow = isFullWindow
    ? 0
    : Math.max(5, Math.round(visibleWindowSecs * chartHz));
  const maxHistoryPoints = Math.max(300, Math.round(120 * chartHz));

  // For short inspection windows (5s/10s) we want every sample painted as
  // soon as it's acquired so the line moves smoothly at 25 Hz. For longer
  // windows we cap publish at 10 Hz to keep React render frequency in check.
  const isShortInspectionWindow =
    visibleWindowSecs === 5 || visibleWindowSecs === 10;
  const publishRateHz = isShortInspectionWindow ? DIRECTOR_STREAM_HZ : 10;

  const {
    history: hotHistory,
    latestTelemetry,
    latestAnomalies,
    clearCache,
  } = useFleetTelemetry({
    cars: safeCars,
    maxHistory: maxHistoryPoints,
    sampleRateHz: chartHz,
    publishRateHz,
  });
  // FULL session view loads downsampled history on demand from the backend
  // ring buffer instead of accumulating client-side. Refreshed every 30s
  // while the FULL window is active and cleared on switch-out.
  const [fullHistory, setFullHistory] = useState<TelemetryDataPoint[]>([]);
  const { latestLocations: fleetLocations } = useFleetLocation({
    cars: safeCars,
  });
  const { status: selectedVehicleStatus } = useVehicleStatus(
    selectedPrimaryCarId || null
  );

  const recording = useRecording({
    vehicleId: selectedPrimaryCarId,
    sourcePage: 'DIRECTOR',
    requestedBy: currentUser?.name ?? 'Race Director',
  });

  // Fetch session-wide history when FULL window is active. Pulls the last
  // 30 minutes (matching mock retention) for currently selected cars and
  // refreshes every 30s. Clears immediately when leaving FULL view.
  useEffect(() => {
    const needsHistoricalCompare =
      isCompareMode && compareDataMode === 'LAP';

    if (!isFullWindow && !needsHistoricalCompare) return;
    const vehicleIds = (
      isCompareMode
        ? safeSelectedCarIds.slice(0, 6)
        : selectedPrimaryCarId > 0
          ? [selectedPrimaryCarId]
          : []
    ).filter((id) => id > 0);
    if (vehicleIds.length === 0) return;

    let cancelled = false;
    const FULL_WINDOW_MS = 30 * 60 * 1000;
    const FULL_LIMIT_PER_VEHICLE = 1500;

    const load = async () => {
      const endMs = Date.now();
      const startMs = endMs - FULL_WINDOW_MS;
      try {
        const responses = await Promise.all(
          vehicleIds.map(async (vehicleId) => {
            const r = await fetchTelemetryHistory({
              vehicleId,
              startDate: new Date(startMs).toISOString(),
              endDate: new Date(endMs).toISOString(),
              limit: FULL_LIMIT_PER_VEHICLE,
            });
            return [vehicleId, r.points] as const;
          })
        );
        if (cancelled) return;
        setFullHistory(buildReplayHistory(new Map(responses)));
      } catch {
        // Keep prior fullHistory on transient failure.
      }
    };

    load();
    const interval = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    compareDataMode,
    isFullWindow,
    isCompareMode,
    safeSelectedCarIds,
    selectedPrimaryCarId,
  ]);

  const compareUsesHistoricalLap = isCompareMode && compareDataMode === 'LAP';
  const chartSourceHistory = useMemo(
    () =>
      isFullWindow || compareUsesHistoricalLap
        ? fullHistory
        : mergeHistoryBySourceTs(fullHistory, hotHistory),
    [compareUsesHistoricalLap, fullHistory, hotHistory, isFullWindow]
  );
  const liveHistory = chartSourceHistory;

  const timelineHistory = isPaused
    ? replayHistory.length > 0
      ? replayHistory
      : liveHistory
    : liveHistory;

  const refreshReplayHistory = useCallback(
    async (options?: {
      anchorTs?: number;
      vehicleIds?: number[];
      force?: boolean;
    }) => {
      if ((!isPaused && !options?.force) || isReplayLoadingRef.current) {
        return;
      }

      const fallbackVehicleIds = isCompareMode
        ? safeSelectedCarIds.slice(0, 6)
        : selectedPrimaryCarId > 0
          ? [selectedPrimaryCarId]
          : [];
      const vehicleIds = options?.vehicleIds?.length
        ? options.vehicleIds
        : fallbackVehicleIds;
      const uniqueVehicleIds = Array.from(new Set(vehicleIds)).filter(
        (id) => id > 0
      );

      if (uniqueVehicleIds.length === 0) {
        return;
      }

      isReplayLoadingRef.current = true;

      try {
        const endMs = Number.isFinite(options?.anchorTs)
          ? (options?.anchorTs as number)
          : Date.now();
        const rangeSec = Math.max(120, visibleWindowSecs * 4);
        const startMs = endMs - rangeSec * 1000;
        const limit = Math.max(300, Math.round(rangeSec * chartHz * 1.5));
        const responses = await Promise.all(
          uniqueVehicleIds.map(async (vehicleId) => {
            const response = await fetchTelemetryHistory({
              vehicleId,
              startDate: new Date(startMs).toISOString(),
              endDate: new Date(endMs).toISOString(),
              limit,
            });
            return [vehicleId, response.points] as const;
          })
        );

        const historyByCar = new Map<number, VehicleTelemetry[]>(responses);
        const merged = buildReplayHistory(historyByCar);
        setReplayHistory(merged);
        if (merged.length === 0) {
          setPlaybackIndex(0);
          return;
        }

        const anchoredPlaybackTs = Number.isFinite(options?.anchorTs)
          ? (options?.anchorTs as number)
          : playbackAnchorTsRef.current;

        if (manualPlaybackRatioRef.current !== null) {
          setPlaybackIndex(
            Math.max(
              0,
              Math.min(
                Math.round((merged.length - 1) * manualPlaybackRatioRef.current),
                merged.length - 1
              )
            )
          );
        } else if (typeof anchoredPlaybackTs === 'number') {
          const targetTs = anchoredPlaybackTs;
          let closestIndex = 0;
          let closestDelta = Number.POSITIVE_INFINITY;
          merged.forEach((point, index) => {
            const ts =
              typeof point.sourceTs === 'number' ? point.sourceTs : NaN;
            if (!Number.isFinite(ts)) return;
            const delta = Math.abs(ts - targetTs);
            if (delta < closestDelta) {
              closestDelta = delta;
              closestIndex = index;
            }
          });
          setPlaybackIndex(closestIndex);
        } else if (manualPlaybackIndexRef.current !== null) {
          setPlaybackIndex(
            Math.max(
              0,
              Math.min(manualPlaybackIndexRef.current, merged.length - 1)
            )
          );
        } else {
          setPlaybackIndex(Math.max(0, merged.length - 1));
        }
      } catch {
        // Keep current timeline intact when replay fetch fails so paused
        // playback remains usable even during backend/network issues.
      } finally {
        isReplayLoadingRef.current = false;
      }
    },
    [
      chartHz,
      isCompareMode,
      isPaused,
      safeSelectedCarIds,
      selectedPrimaryCarId,
      visibleWindowSecs,
    ]
  );

  useEffect(() => {
    if (!isPaused) return;
    if (incidentReplayLockedRef.current) {
      return;
    }
    if (playbackAnchorTsRef.current === null) {
      return;
    }
    if (skipNextAutoReplayFetchRef.current) {
      skipNextAutoReplayFetchRef.current = false;
      return;
    }
    void refreshReplayHistory({ force: true });
  }, [isPaused, refreshReplayHistory]);

  useEffect(() => {
    if (latestAnomalies.size === 0) return;

    // Seed baseline from the first snapshot so initial historical counts
    // do not trigger a false "new violation" flash for the whole grid.
    if (!hasViolationBaselineRef.current) {
      latestAnomalies.forEach((anomaly, carId) => {
        previousViolationTotalsRef.current.set(carId, anomaly.totalViolations);
        previousAnomalyTotalsRef.current.set(carId, anomaly.totalAnomalies);
      });
      hasViolationBaselineRef.current = true;
      return;
    }

    const now = Date.now();
    const newlyViolatedCarIds: number[] = [];
    const newlyAnomalousCarIds: number[] = [];

    latestAnomalies.forEach((anomaly, carId) => {
      const prevViolations =
        previousViolationTotalsRef.current.get(carId) ?? 0;
      const prevAnomalies = previousAnomalyTotalsRef.current.get(carId) ?? 0;

      if (anomaly.totalViolations > prevViolations) {
        newlyViolatedCarIds.push(carId);
      }
      if (anomaly.totalAnomalies > prevAnomalies) {
        newlyAnomalousCarIds.push(carId);
      }

      previousViolationTotalsRef.current.set(carId, anomaly.totalViolations);
      previousAnomalyTotalsRef.current.set(carId, anomaly.totalAnomalies);
    });

    if (newlyViolatedCarIds.length > 0) {
      setViolationFlashUntilByCar((prev) => {
        const next = new Map(prev);
        newlyViolatedCarIds.forEach((carId) => {
          next.set(carId, now + VIOLATION_HIGHLIGHT_MS);
        });
        return next;
      });
    }

    if (newlyAnomalousCarIds.length > 0) {
      setAnomalyFlashUntilByCar((prev) => {
        const next = new Map(prev);
        newlyAnomalousCarIds.forEach((carId) => {
          next.set(carId, now + VIOLATION_HIGHLIGHT_MS);
        });
        return next;
      });
    }
  }, [latestAnomalies]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setViolationFlashUntilByCar((prev) => {
        if (prev.size === 0) return prev;
        const next = new Map(prev);
        prev.forEach((until, carId) => {
          if (until <= now) next.delete(carId);
        });
        return next.size === prev.size ? prev : next;
      });
      setAnomalyFlashUntilByCar((prev) => {
        if (prev.size === 0) return prev;
        const next = new Map(prev);
        prev.forEach((until, carId) => {
          if (until <= now) next.delete(carId);
        });
        return next.size === prev.size ? prev : next;
      });
    }, 500);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isPaused) {
      setPlaybackIndex(Math.max(0, liveHistory.length - 1));
    }
  }, [isPaused, liveHistory.length]);

  useEffect(() => {
    if (!isPaused) {
      setReplayHistory([]);
      if (replayRefreshTimerRef.current !== null) {
        window.clearTimeout(replayRefreshTimerRef.current);
        replayRefreshTimerRef.current = null;
      }
    }
  }, [isPaused]);

  useEffect(() => {
    return () => {
      if (replayRefreshTimerRef.current !== null) {
        window.clearTimeout(replayRefreshTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (safeCars.length === 0) {
      setSelectedCarIds([]);
      return;
    }
    setSelectedCarIds((prev) => {
      const valid = prev.filter((id) => safeCars.some((c) => c.id === id));
      if (valid.length === 0) {
        const defaultId = safeCars.some((c) => c.id === activeCarId)
          ? activeCarId
          : safeCars[0].id;
        return [defaultId];
      }
      return valid;
    });
  }, [safeCars, activeCarId]);

  const getThresholdValue = useCallback(
    (key: string, fallback: number) => {
      if (key in thresholds) return thresholds[key as keyof typeof thresholds];
      return fallback;
    },
    [thresholds]
  );

  useEffect(() => {
    if (latestTelemetry.length === 0) return;

    const latestTick =
      typeof liveHistory[liveHistory.length - 1]?.tick === 'number'
        ? (liveHistory[liveHistory.length - 1]?.tick as number)
        : 0;
    const latestSourceTs =
      typeof liveHistory[liveHistory.length - 1]?.sourceTs === 'number'
        ? (liveHistory[liveHistory.length - 1]?.sourceTs as number)
        : Date.now();
    const now = Date.now();
    const nowText = new Date(now).toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const nextAlerts: BreachAlert[] = [];

    latestTelemetry.forEach((car) => {
      DIRECTOR_METRICS.forEach((metric) => {
        const value =
          typeof car[metric.key] === 'number' ? (car[metric.key] as number) : 0;
        const threshold = getThresholdValue(metric.key, metric.threshold);
        const rule = metricRules[metric.key] ?? DEFAULT_METRIC_RULE;
        const breachKey = `${car.id}-${metric.key}`;

        if (value > threshold) {
          if (!breachStartedAtRef.current[breachKey]) {
            breachStartedAtRef.current[breachKey] = now;
            breachCountsRef.current[breachKey] = 0;
          }
          const elapsed = (now - breachStartedAtRef.current[breachKey]) / 1000;
          if (elapsed >= rule.alertDelay) {
            breachCountsRef.current[breachKey] =
              (breachCountsRef.current[breachKey] ?? 0) + 1;
            if (breachCountsRef.current[breachKey] >= rule.penaltyThreshold) {
              nextAlerts.push({
                id: `${Date.now()}-${car.id}-${metric.key}`,
                carId: car.id,
                carNumber: car.number,
                metric: metric.key,
                value,
                threshold,
                timestamp: nowText,
                sourceTs: latestSourceTs,
                tick: latestTick,
                curve: `T${Math.floor(Math.random() * 12) + 1}`,
                snapshot: {
                  speed: car.speed,
                  rpm: car.rpm,
                  throttle: car.throttle,
                  boost: car.boost,
                  lambda: car.lambda,
                  gLat: car.gLat,
                  gLong: car.gLong,
                  brake: car.brake,
                  distance:
                    typeof car.distance === 'number' ? car.distance : undefined,
                },
              });
              breachCountsRef.current[breachKey] = 0;
              // Restart the delay timer so the next alert requires
              // another full alertDelay period instead of firing every frame.
              breachStartedAtRef.current[breachKey] = now;
            }
          }
        } else {
          delete breachStartedAtRef.current[breachKey];
          delete breachCountsRef.current[breachKey];
        }
      });
    });

    if (nextAlerts.length > 0) {
      setAlerts((prev) => [...nextAlerts, ...prev].slice(0, 80));
    }
  }, [getThresholdValue, liveHistory, latestTelemetry, metricRules]);

  const activeMetrics = useMemo(
    () =>
      activeMetricKeys
        .map((k) => DIRECTOR_METRICS.find((m) => m.key === k))
        .filter((m) => m !== undefined),
    [activeMetricKeys]
  );

  const effectiveHistory = useMemo(() => {
    if (timelineHistory.length === 0) return [];
    const end = isPaused
      ? Math.min(playbackIndex, timelineHistory.length - 1)
      : timelineHistory.length - 1;
    return timelineHistory.slice(0, end + 1);
  }, [isPaused, playbackIndex, timelineHistory]);

  const compareDistanceDomain = useMemo<[number, number] | undefined>(() => {
    if (!isCompareMode || selectedPrimaryCarId <= 0) return undefined;

    if (compareDataMode === 'LAP') {
      const trackLengthMeters =
        fleetLocations.find(
          (location) => location.vehicleId === selectedPrimaryCarId
        )?.trackLengthMeters ?? 4554;
      const lapStart = Math.max(0, selectedCompareLap - 1) * trackLengthMeters;
      return [lapStart, lapStart + trackLengthMeters];
    }

    const distanceKey = `distance_${selectedPrimaryCarId}`;
    const distanceValues = effectiveHistory
      .map((point) => point[distanceKey])
      .filter((value): value is number => typeof value === 'number');

    if (distanceValues.length < 2) return undefined;

    const firstDistance = distanceValues[0];
    const lastDistance = distanceValues[distanceValues.length - 1];
    if (isFullWindow) {
      return [firstDistance, lastDistance];
    }

    // Estimate distance velocity from recent distance deltas to keep the
    // distance window stable over time and avoid mode-switch jitter.
    const samplePoints = Math.min(
      distanceValues.length - 1,
      Math.max(1, chartHz * 5)
    );
    const baseIndex = distanceValues.length - 1 - samplePoints;
    const deltaDistance = Math.max(0, lastDistance - distanceValues[baseIndex]);
    const deltaSeconds = samplePoints / chartHz;
    const estimatedMetersPerSecond = Math.max(
      20,
      Math.min(120, deltaSeconds > 0 ? deltaDistance / deltaSeconds : 50)
    );
    const distanceSpanMeters = visibleWindowSecs * estimatedMetersPerSecond;
    const minDistance = Math.max(0, lastDistance - distanceSpanMeters);

    return [Math.max(firstDistance, minDistance), lastDistance];
  }, [
    chartHz,
    compareDataMode,
    effectiveHistory,
    fleetLocations,
    isCompareMode,
    isFullWindow,
    selectedCompareLap,
    selectedPrimaryCarId,
    visibleWindowSecs,
  ]);

  const graphResetKey = useMemo(
    () =>
      [
        isFullWindow ? 'full' : 'hot',
        visibleWindowSecs,
        isCompareMode ? 'compare' : 'single',
        compareDataMode,
        selectedCompareLap,
        selectedPrimaryCarId,
      ].join(':'),
    [
      compareDataMode,
      isCompareMode,
      isFullWindow,
      selectedCompareLap,
      selectedPrimaryCarId,
      visibleWindowSecs,
    ]
  );

  const maxGraphPoints = useMemo(() => {
    // Keep much higher density than before so 25 Hz streams remain inspectable
    // while still preventing pathological render load on long windows.
    const targetRenderHz = Math.min(chartHz, 16);
    const dynamicLimit = Math.round(visibleWindowSecs * targetRenderHz);
    return Math.max(240, dynamicLimit);
  }, [chartHz, visibleWindowSecs]);

  const disableCompactionForShortWindow =
    visibleWindowSecs === 5 || visibleWindowSecs === 10;

  const graphData = useMemo(() => {
    if (effectiveHistory.length === 0) return [];

    if (!isCompareMode || !compareDistanceDomain || selectedPrimaryCarId <= 0) {
      // FULL session view: render the entire cold buffer (already ~2 Hz),
      // with a final compaction pass to cap render cost on long sessions.
      if (isFullWindow) {
        return compactGraphPoints(effectiveHistory, maxGraphPoints);
      }

      const latestSourceTs =
        typeof effectiveHistory[effectiveHistory.length - 1]?.sourceTs ===
        'number'
          ? (effectiveHistory[effectiveHistory.length - 1]?.sourceTs as number)
          : Number.NaN;

      const timeWindowed = Number.isFinite(latestSourceTs)
        ? effectiveHistory.filter((point) => {
            const pointTs = point.sourceTs;
            return (
              typeof pointTs === 'number' &&
              pointTs >= latestSourceTs - visibleWindowSecs * 1000
            );
          })
        : effectiveHistory.slice(
            Math.max(0, effectiveHistory.length - visibleWindow)
          );

      const baseWindowData =
        timeWindowed.length > 0
          ? timeWindowed
          : effectiveHistory.slice(
              Math.max(0, effectiveHistory.length - visibleWindow)
            );

      return disableCompactionForShortWindow
        ? baseWindowData
        : compactGraphPoints(baseWindowData, maxGraphPoints);
    }

    const [minDistance, maxDistance] = compareDistanceDomain;
    const distanceKey = `distance_${selectedPrimaryCarId}`;
    const filtered = effectiveHistory.filter((point) => {
      const value = point[distanceKey];
      return (
        typeof value === 'number' &&
        value >= minDistance &&
        value <= maxDistance
      );
    });

    if (filtered.length > 0) {
      return disableCompactionForShortWindow
        ? filtered
        : compactGraphPoints(filtered, maxGraphPoints);
    }

    const lastPointWithDistance = [...effectiveHistory]
      .reverse()
      .find((point) => typeof point[distanceKey] === 'number');
    return lastPointWithDistance ? [lastPointWithDistance] : [];
  }, [
    compareDistanceDomain,
    disableCompactionForShortWindow,
    effectiveHistory,
    isCompareMode,
    isFullWindow,
    maxGraphPoints,
    selectedPrimaryCarId,
    visibleWindowSecs,
    visibleWindow,
  ]);

  const currentSnapshot = effectiveHistory[effectiveHistory.length - 1] || {};
  const latestTelemetryByCar = useMemo(
    () => new Map(latestTelemetry.map((car) => [car.id, car])),
    [latestTelemetry]
  );

  const getMetricValue = (key: string, carId: number) => {
    if (!isPaused) {
      const liveCar = latestTelemetryByCar.get(carId);
      const liveValue = liveCar?.[key];
      if (typeof liveValue === 'number') return liveValue;
    }

    const v = currentSnapshot[`${key}_${carId}`];
    return typeof v === 'number' ? v : 0;
  };

  const displayCars: DisplayCar[] = useMemo(
    () =>
      [...safeCars]
        .sort((a, b) => Number(a.number) - Number(b.number))
        .map((car) => {
          const hasBackendViolation =
            (violationFlashUntilByCar.get(car.id) ?? 0) > Date.now();
          const hasBackendAnomaly =
            (anomalyFlashUntilByCar.get(car.id) ?? 0) > Date.now();
          return {
            ...car,
            hasBackendAnomaly,
            hasBackendViolation,
            status: hasBackendAnomaly
              ? 'CRITICAL'
              : hasBackendViolation
                ? 'WARN'
                : 'OK',
          } as DisplayCar;
        }),
    [anomalyFlashUntilByCar, safeCars, violationFlashUntilByCar]
  );

  const filteredAlerts = useMemo(() => {
    if (!filterSelectedOnly) return safeAlerts;

    const selectedMatches = safeAlerts.filter((a) =>
      safeSelectedCarIds.includes(a.carId)
    );

    return selectedMatches.length > 0 ? selectedMatches : safeAlerts;
  }, [safeAlerts, filterSelectedOnly, safeSelectedCarIds]);

  const handleMetricChange = (index: number, nextKey: DirectorMetricKey) => {
    setActiveMetricKeys((cur) => {
      const existing = cur.indexOf(nextKey);
      const next = [...cur];
      if (existing !== -1 && existing !== index) {
        next[existing] = cur[index];
      }
      next[index] = nextKey;
      return next;
    });
  };

  const handleGraphCountChange = (count: number) => {
    setActiveMetricKeys((current) => {
      const nextCount = Math.max(1, Math.min(5, count));
      if (current.length === nextCount) return current;
      if (current.length > nextCount) return current.slice(0, nextCount);

      const available = DIRECTOR_METRICS.map((metric) => metric.key).filter(
        (key): key is DirectorMetricKey =>
          !current.includes(key as DirectorMetricKey)
      );
      return [...current, ...available].slice(0, nextCount);
    });
  };

  const handleMetricThresholdChange = (key: string, value: number) => {
    if (key in thresholds) {
      setThresholds({ ...thresholds, [key as keyof typeof thresholds]: value });
      setThresholdSaveStatus('idle');
    }
  };

  const handleRuleChange = (
    key: string,
    field: keyof MetricRuntimeRule,
    value: number
  ) => {
    setMetricRules((cur) => ({
      ...cur,
      [key]: { ...(cur[key] ?? DEFAULT_METRIC_RULE), [field]: value },
    }));
    setThresholdSaveStatus('idle');
  };

  const handleSaveThresholds = useCallback(() => {
    const payload = Object.fromEntries(
      DIRECTOR_METRICS.map((metric) => {
        const rule = metricRules[metric.key] ?? DEFAULT_METRIC_RULE;
        return [
          metric.key,
          {
            threshold: getThresholdValue(metric.key, metric.threshold),
            alertDelay: rule.alertDelay,
            warningPenalty: rule.penaltyThreshold,
          },
        ];
      })
    ) as DirectorThresholdsConfig;

    setIsSavingThresholds(true);
    setThresholdSaveStatus('idle');

    void updateDirectorThresholds(payload)
      .then(() => {
        setThresholdSaveStatus('saved');
      })
      .catch(() => {
        setThresholdSaveStatus('error');
      })
      .finally(() => {
        setIsSavingThresholds(false);
      });
  }, [getThresholdValue, metricRules]);

  const toggleCompareMode = () => {
    setIsCompareMode((cur) => {
      if (cur) setSelectedCarIds((s) => (s.length > 0 ? [s[0]] : []));
      return !cur;
    });
  };

  const handleTogglePause = () => {
    if (isPaused) {
      incidentReplayLockedRef.current = false;
      playbackAnchorTsRef.current = null;
      manualPlaybackIndexRef.current = null;
      manualPlaybackRatioRef.current = null;
    } else {
      setPausedFleetLocations(fleetLocations);
      setReplayHistory(liveHistory);
      setPlaybackIndex(Math.max(0, liveHistory.length - 1));
      playbackAnchorTsRef.current = null;
      manualPlaybackIndexRef.current = null;
      manualPlaybackRatioRef.current = null;
    }
    setIsPaused((current) => !current);
  };

  const handleScrub = (nextIndex: number) => {
    const sourceHistory = isPaused
      ? replayHistory.length > 0
        ? replayHistory
        : liveHistory
      : liveHistory;
    const clampedIndex = Math.max(
      0,
      Math.min(nextIndex, Math.max(0, sourceHistory.length - 1))
    );
    const anchor = sourceHistory[clampedIndex]?.sourceTs;
    playbackAnchorTsRef.current =
      typeof anchor === 'number' ? anchor : playbackAnchorTsRef.current;
    manualPlaybackIndexRef.current = clampedIndex;
    manualPlaybackRatioRef.current =
      sourceHistory.length > 1 ? clampedIndex / (sourceHistory.length - 1) : 0;

    if (!isPaused) {
      setPausedFleetLocations(fleetLocations);
      setReplayHistory(sourceHistory);
      setIsPaused(true);
    }

    setPlaybackIndex(clampedIndex);

    incidentReplayLockedRef.current = false;

    if (replayRefreshTimerRef.current !== null) {
      window.clearTimeout(replayRefreshTimerRef.current);
    }
    replayRefreshTimerRef.current = window.setTimeout(() => {
      void refreshReplayHistory({
        anchorTs: typeof anchor === 'number' ? anchor : undefined,
      });
    }, 250);
  };

  const handleSelectAlert = (alert: BreachAlert) => {
    const nearestLiveIndex = (() => {
      if (liveHistory.length === 0) return 0;
      let closestIndex = 0;
      let closestDelta = Number.POSITIVE_INFINITY;
      liveHistory.forEach((point, index) => {
        const ts =
          typeof point.sourceTs === 'number' ? point.sourceTs : Number.NaN;
        if (!Number.isFinite(ts)) return;
        const delta = Math.abs(ts - alert.sourceTs);
        if (delta < closestDelta) {
          closestDelta = delta;
          closestIndex = index;
        }
      });
      return closestIndex;
    })();

    const incidentPoint = buildIncidentPoint(alert);
    const contextStart = Math.max(0, nearestLiveIndex - visibleWindow);
    const contextEnd = Math.min(
      liveHistory.length,
      nearestLiveIndex + Math.max(10, Math.floor(visibleWindow / 3))
    );
    const surroundingPoints = liveHistory
      .slice(contextStart, contextEnd)
      .filter((point) => {
        const pointTs = point.sourceTs;
        return (
          typeof pointTs !== 'number' ||
          Math.abs(pointTs - alert.sourceTs) > 250
        );
      });
    const incidentReplay: TelemetryDataPoint[] = [
      ...surroundingPoints,
      incidentPoint,
    ]
      .sort((a, b) => {
        const aTs = typeof a.sourceTs === 'number' ? a.sourceTs : 0;
        const bTs = typeof b.sourceTs === 'number' ? b.sourceTs : 0;
        return aTs - bTs;
      })
      .map((point, index) => ({ ...point, tick: index + 1 }));
    const incidentIndex = incidentReplay.findIndex(
      (point) =>
        typeof point.sourceTs === 'number' && point.sourceTs === alert.sourceTs
    );

    flushSync(() => {
      setIsCompareMode(false);
      setSelectedCarIds([alert.carId]);
      setActiveCarId(alert.carId);
    });
    playbackAnchorTsRef.current = alert.sourceTs;
    manualPlaybackIndexRef.current =
      incidentIndex >= 0 ? incidentIndex : nearestLiveIndex;
    manualPlaybackRatioRef.current = null;
    setPausedFleetLocations(fleetLocations);
    setReplayHistory(incidentReplay);
    incidentReplayLockedRef.current = true;
    skipNextAutoReplayFetchRef.current = true;
    setIsPaused(true);
    setPlaybackIndex(incidentIndex >= 0 ? incidentIndex : nearestLiveIndex);
  };

  const toggleCarSelection = (carId: number) => {
    if (isCompareMode) {
      setSelectedCarIds((cur) => {
        if (cur.includes(carId))
          return cur.length === 1 ? cur : cur.filter((id) => id !== carId);
        if (cur.length >= 6) return cur;
        return [...cur, carId];
      });
      return;
    }
    setSelectedCarIds([carId]);
    setActiveCarId(carId);
  };

  if (!canAccessRoute('/director', currentRole)) {
    return (
      <AccessDeniedState message="Your role does not have access to the Director Graph dashboard." />
    );
  }

  const mapLocations = isPaused ? pausedFleetLocations : fleetLocations;
  const selectedMapLocation = mapLocations.find(
    (location) => location.vehicleId === selectedPrimaryCarId
  );
  const mapStats = {
    lap: selectedMapLocation?.lap ?? selectedVehicleStatus?.lap ?? 0,
    totalLaps: selectedVehicleStatus?.totalLaps ?? 30,
    currentTime: selectedVehicleStatus?.currentTime ?? '--:--.---',
    bestTime: selectedVehicleStatus?.bestTime ?? '--:--.---',
  };

  return (
    <div className="relative flex h-screen w-full flex-col gap-4 overflow-hidden px-6 pt-6 pb-24 text-white">
      <PageHeader
        title="Mission Control"
        subtitle="Live Race Telemetry & Breach Monitoring"
      />
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <DirectorToolbar
          carsCount={safeCars.length}
          visibleWindow={visibleWindowSecs}
          onWindowChange={setVisibleWindowSecs}
          displayCars={displayCars}
          selectedCarIds={safeSelectedCarIds}
          onToggleCarSelection={toggleCarSelection}
          isCompareMode={isCompareMode}
          onToggleCompare={toggleCompareMode}
          compareDataMode={compareDataMode}
          onCompareDataModeChange={setCompareDataMode}
          selectedCompareLap={selectedCompareLap}
          onSelectedCompareLapChange={setSelectedCompareLap}
          totalLaps={selectedVehicleStatus?.totalLaps ?? 30}
          recState={recording.recState}
          recordingDuration={recording.recordingDuration}
          selectedPrimaryCarId={selectedPrimaryCarId}
          onStartRecording={() => recording.handleStart('Director_Session')}
          onStopRecording={recording.handleStop}
          allowRecording={!isCompetitor}
          graphCount={activeMetricKeys.length}
          onGraphCountChange={handleGraphCountChange}
        />

        <div className="flex min-h-0 flex-1 gap-4">
          <div className="relative flex min-h-0 flex-1 flex-col gap-2">
            {activeMetrics.map((metric, idx) => (
              <DirectorMetricRow
                key={metric.key}
                metric={metric}
                metricIndex={idx}
                thresholdValue={getThresholdValue(metric.key, metric.threshold)}
                metricRule={metricRules[metric.key] ?? DEFAULT_METRIC_RULE}
                isSettingsOpen={openSettingsKey === metric.key}
                onToggleSettings={() =>
                  setOpenSettingsKey((c) =>
                    c === metric.key ? null : metric.key
                  )
                }
                onCloseSettings={() => setOpenSettingsKey(null)}
                onMetricChange={handleMetricChange}
                onThresholdChange={handleMetricThresholdChange}
                onRuleChange={handleRuleChange}
                onSaveThresholds={handleSaveThresholds}
                isSavingThresholds={isSavingThresholds}
                thresholdSaveStatus={thresholdSaveStatus}
                graphData={graphData}
                graphResetKey={graphResetKey}
                compareDistanceDomain={compareDistanceDomain}
                selectedCarIds={safeSelectedCarIds}
                isCompareMode={isCompareMode}
                currentVal={getMetricValue(metric.key, selectedPrimaryCarId)}
                activeMetricKeys={activeMetricKeys}
                allowSettings={!isCompetitor}
                violationCount={
                  latestAnomalies.get(selectedPrimaryCarId)?.metrics[metric.key]
                    ?.violations ?? 0
                }
                penaltyCount={
                  latestAnomalies.get(selectedPrimaryCarId)?.metrics[metric.key]
                    ?.anomalies ?? 0
                }
                showCounts={!isCompetitor}
              />
            ))}
          </div>

          <div className="flex min-h-0 w-80 shrink-0 flex-col gap-4 overflow-hidden">
            <DirectorRightPanel
              rightPanelPage={rightPanelPage}
              onTogglePage={() =>
                setRightPanelPage((c) =>
                  c === 'DIRECTOR' ? 'MAP' : 'DIRECTOR'
                )
              }
              isCompareMode={isCompareMode}
              onToggleCompare={toggleCompareMode}
              raceStatus={raceStatus}
              onSetRaceStatus={setRaceStatus}
              fleetLocations={mapLocations}
              selectedPrimaryCarId={selectedPrimaryCarId}
              selectedCarIds={safeSelectedCarIds}
              cars={safeCars}
              allowDirectorControls={!isCompetitor}
              mapStats={mapStats}
            />

            {!isCompetitor && (
              <DirectorBreachLog
                alerts={filteredAlerts}
                filterSelectedOnly={filterSelectedOnly}
                onToggleFilter={() => setFilterSelectedOnly((c) => !c)}
                onClear={() => setAlerts([])}
                onSelectAlert={handleSelectAlert}
              />
            )}
          </div>
        </div>
      </div>

      {recording.saveModalOpen && (
        <SaveRecordingModal
          recordingName={recording.recordingName}
          selectedFolder={recording.selectedFolder}
          folderOptions={recording.folderOptions}
          isNewFolder={recording.isNewFolder}
          newFolderName={recording.newFolderName}
          onRecordingNameChange={recording.setRecordingName}
          onFolderChange={recording.setSelectedFolder}
          onIsNewFolderChange={recording.setIsNewFolder}
          onNewFolderNameChange={recording.setNewFolderName}
          onCancel={recording.handleCancel}
          onSave={() => void recording.handleSave()}
        />
      )}

      <EngineeringFooter
        isPaused={isPaused}
        onTogglePause={handleTogglePause}
        playbackIndex={playbackIndex}
        historyLength={timelineHistory.length}
        onScrub={handleScrub}
        timestamp={
          typeof currentSnapshot.time === 'string'
            ? currentSnapshot.time
            : '--:--:--'
        }
        onResumeLive={() => {
          incidentReplayLockedRef.current = false;
          playbackAnchorTsRef.current = null;
          manualPlaybackIndexRef.current = null;
          manualPlaybackRatioRef.current = null;
          setIsPaused(false);
          setPausedFleetLocations(fleetLocations);
          setPlaybackIndex(Math.max(0, liveHistory.length - 1));
          clearCache();
        }}
      />
    </div>
  );
}
