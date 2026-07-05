import type {
  MetricDefinition,
  TelemetryDataPoint,
} from '@/components/features/TelemetryChart';
import type { Car, CarTelemetry, Thresholds } from '@/types';

export type DirectorMetricKey =
  | 'boost'
  | 'speed'
  | 'rpm'
  | 'lambda'
  | 'gLat'
  | 'gLong'
  | 'throttle'
  | 'brake';

export interface MetricStats {
  min: number;
  max: number;
}

export interface AggregatedCarData {
  stats: {
    speed: MetricStats;
    rpm: MetricStats;
    boost: MetricStats;
    lambda: MetricStats;
    gLat: MetricStats;
    gLong: MetricStats;
    throttle: MetricStats;
    brake: MetricStats;
  };
  violations: {
    speed: number;
    rpm: number;
    boost: number;
    lambda: number;
    gLat: number;
    gLong: number;
    throttle: number;
    brake: number;
  };
}

export const DIRECTOR_METRICS: MetricDefinition[] = [
  {
    key: 'boost',
    label: 'Boost',
    unit: 'kPa',
    min: 0,
    max: 4,
    threshold: 2.8,
    color: '#fb923c',
  },
  {
    key: 'speed',
    label: 'Speed',
    unit: 'km/h',
    min: 0,
    max: 350,
    threshold: 310,
    color: '#ec4899',
  },
  {
    key: 'rpm',
    label: 'RPM',
    unit: 'RPM',
    min: 0,
    max: 15000,
    threshold: 12500,
    color: '#3b82f6',
  },
  {
    key: 'lambda',
    label: 'Lambda',
    unit: 'λ',
    min: 0.7,
    max: 1.3,
    threshold: 0.95,
    color: '#eab308',
  },
  {
    key: 'gLat',
    label: 'G Lat',
    unit: 'g',
    min: -3,
    max: 3,
    threshold: 2.5,
    color: '#22c55e',
  },
  {
    key: 'gLong',
    label: 'G Long',
    unit: 'g',
    min: -3,
    max: 3,
    threshold: 2.5,
    color: '#06b6d4',
  },
  {
    key: 'throttle',
    label: 'Throttle',
    unit: '%',
    min: 0,
    max: 100,
    threshold: 95,
    color: '#a855f7',
  },
  {
    key: 'brake',
    label: 'Brake',
    unit: '%',
    min: 0,
    max: 100,
    threshold: 90,
    color: '#ef4444',
  },
];

export const DIRECTOR_WINDOW_OPTIONS = [
  { label: '5S', value: 5 },
  { label: '10S', value: 10 },
  { label: '30S', value: 30 },
  { label: '1M', value: 60 },
  { label: 'FULL', value: -1 },
] as const;

/** Sentinel value for the "FULL session" window — uses the cold (downsampled) buffer. */
export const FULL_SESSION_WINDOW = -1;

const createDefaultAggregatedCarData = (
  carData: CarTelemetry
): AggregatedCarData => ({
  stats: {
    speed: { min: carData.speed, max: carData.speed },
    rpm: { min: carData.rpm, max: carData.rpm },
    boost: { min: carData.boost, max: carData.boost },
    lambda: { min: carData.lambda, max: carData.lambda },
    gLat: { min: carData.gLat, max: carData.gLat },
    gLong: { min: carData.gLong, max: carData.gLong },
    throttle: { min: carData.throttle, max: carData.throttle },
    brake: { min: carData.brake, max: carData.brake },
  },
  violations: {
    speed: 0,
    rpm: 0,
    boost: 0,
    lambda: 0,
    gLat: 0,
    gLong: 0,
    throttle: 0,
    brake: 0,
  },
});

const updateStat = (stat: MetricStats, value: number): MetricStats => ({
  min: Math.min(stat.min, value),
  max: Math.max(stat.max, value),
});

export function generateTelemetryBatch(
  cars: Car[],
  tick: number
): CarTelemetry[] {
  return cars.map((car) => {
    const baseOffset = (car.id % 5) * 10;
    const anomalyBias = Math.random() > 0.96 ? 1 : 0;

    const speed =
      185 +
      baseOffset +
      Math.sin(tick * 0.08 + car.id) * 28 +
      Math.random() * 12 +
      anomalyBias * 42;
    const rpm =
      8200 +
      baseOffset * 10 +
      Math.sin(tick * 0.11 + car.id) * 900 +
      Math.random() * 600 +
      anomalyBias * 1700;
    const throttle = Math.max(0, Math.min(100, 68 + Math.random() * 34));

    return {
      id: car.id,
      number: car.number,
      speed,
      rpm,
      fuelFlow: 78 + Math.random() * 22,
      fuelPressure: 3.8 + Math.random() * 1.2,
      boost: 1.6 + Math.random() * 1.2,
      throttle,
      brake: Math.max(0, Math.min(100, 30 + Math.sin(tick * 0.12) * 45)),
      gLat: Math.sin(tick * 0.14 + car.id) * 2.2,
      gLong: Math.cos(tick * 0.1 + car.id) * 1.8,
      ignitionTiming: 30 + Math.random() * 11,
      airflow: 340 + Math.random() * 120,
      lambda: 0.94 + Math.random() * 0.12,
      timestamp: Date.now(),
      lap: 12,
      distance: 4200 + tick * 4,
    };
  });
}

export function createTelemetryHistoryPoint(
  telemetryBatch: CarTelemetry[],
  tick: number
): TelemetryDataPoint {
  const sourceTs = Date.now();
  const time = new Date().toLocaleTimeString([], {
    hour12: false,
    minute: '2-digit',
    second: '2-digit',
  });

  const point: TelemetryDataPoint = { time, tick, sourceTs };

  telemetryBatch.forEach((carData) => {
    point[`speed_${carData.id}`] = carData.speed;
    point[`rpm_${carData.id}`] = carData.rpm;
    point[`boost_${carData.id}`] = carData.boost;
    point[`lambda_${carData.id}`] = carData.lambda;
    point[`gLat_${carData.id}`] = carData.gLat;
    point[`gLong_${carData.id}`] = carData.gLong;
    point[`throttle_${carData.id}`] = carData.throttle;
    point[`brake_${carData.id}`] = carData.brake;
    point[`distance_${carData.id}`] = carData.distance;
  });

  return point;
}

export function accumulateAggregatedData(
  previous: Record<number, AggregatedCarData>,
  telemetryBatch: CarTelemetry[],
  thresholds: Thresholds
): Record<number, AggregatedCarData> {
  const next = { ...previous };

  telemetryBatch.forEach((carData) => {
    const previousCar =
      next[carData.id] ?? createDefaultAggregatedCarData(carData);

    const stats = {
      speed: updateStat(previousCar.stats.speed, carData.speed),
      rpm: updateStat(previousCar.stats.rpm, carData.rpm),
      boost: updateStat(previousCar.stats.boost, carData.boost),
      lambda: updateStat(previousCar.stats.lambda, carData.lambda),
      gLat: updateStat(previousCar.stats.gLat, carData.gLat),
      gLong: updateStat(previousCar.stats.gLong, carData.gLong),
      throttle: updateStat(previousCar.stats.throttle, carData.throttle),
      brake: updateStat(previousCar.stats.brake, carData.brake),
    };

    const violations = { ...previousCar.violations };

    if (carData.speed > thresholds.speed) violations.speed += 1;
    if (carData.rpm > thresholds.rpm) violations.rpm += 1;
    if (carData.boost > thresholds.boost) violations.boost += 1;
    if (carData.lambda > thresholds.lambda) violations.lambda += 1;
    if (Math.abs(carData.gLat) > thresholds.gLat) violations.gLat += 1;
    if (Math.abs(carData.gLong) > thresholds.gLong) violations.gLong += 1;
    if (carData.throttle > thresholds.throttle) violations.throttle += 1;
    if (carData.brake > thresholds.brake) violations.brake += 1;

    next[carData.id] = { stats, violations };
  });

  return next;
}
