import type { TireTelemetry, VehicleTelemetry, DriverBiometric } from '@/types';

export interface EngineeringTelemetryPoint {
  timestamp: string;
  originalTime: number;
  heartRate: number;
  respiration: number;
  stressLevel: number;
  steering: number;
  throttle: number;
  brake: number;
  gLat: number;
  gLong: number;
  heading: number;
  speed: number;
  rpm: number;
  oilTemp: number;
  fuel: number;
  lambda: number;
  boost: number;
  drs: boolean;
  tires: {
    fl: TireTelemetry;
    fr: TireTelemetry;
    rl: TireTelemetry;
    rr: TireTelemetry;
  };
  airTemp: number;
  humidity: number;
  windSpeed: number;
  pressure: number;
  airflow: number;
  ignitionTiming: number;
}

export interface EngineeringLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface EngineeringStatusData {
  position: string;
  lap: number;
  totalLaps: number;
  currentTime: string;
  bestTime: string;
}

export interface EngineeringGapRival {
  number: string;
  name: string;
  /** Legacy time-based gap (seconds). */
  gap: number;
  /** Legacy sign flag: true => ahead (+), false => behind (-). */
  isPos: boolean;
  /** Position-based compare fields (production-grade). */
  gapMeters?: number;
  deltaPosition?: number;
  relation?: 'AHEAD' | 'BEHIND';
}

export interface EngineeringMapRival {
  id: number | string;
  name: string;
  color: string;
  progress: number;
  isSelected?: boolean;
}

export const DEFAULT_TIRES: EngineeringTelemetryPoint['tires'] = {
  fl: { speed: 0, temp: 0, press: 0, brake: 0 },
  fr: { speed: 0, temp: 0, press: 0, brake: 0 },
  rl: { speed: 0, temp: 0, press: 0, brake: 0 },
  rr: { speed: 0, temp: 0, press: 0, brake: 0 },
};

export const DEFAULT_ENG_POINT: EngineeringTelemetryPoint = {
  timestamp: '--:--:--',
  originalTime: 0,
  heartRate: 0,
  respiration: 0,
  stressLevel: 0,
  steering: 0,
  throttle: 0,
  brake: 0,
  gLat: 0,
  gLong: 0,
  heading: 0,
  speed: 0,
  rpm: 0,
  oilTemp: 0,
  fuel: 0,
  lambda: 1,
  boost: 0,
  drs: false,
  tires: DEFAULT_TIRES,
  airTemp: 0,
  humidity: 0,
  windSpeed: 0,
  pressure: 0,
  airflow: 0,
  ignitionTiming: 0,
};

export const DEFAULT_ENGINEERING_STATUS: EngineeringStatusData = {
  position: '--',
  lap: 0,
  totalLaps: 0,
  currentTime: '--:--.---',
  bestTime: '--:--.---',
};

export const INITIAL_ENGINEERING_LAYOUT: EngineeringLayoutItem[] = [
  { i: 'alerts', x: 0, y: 0, w: 1, h: 4 },
  { i: 'status', x: 1, y: 0, w: 1, h: 2 },
  { i: 'telemetry_hub', x: 2, y: 0, w: 2, h: 4 },
  { i: 'heart', x: 0, y: 4, w: 1, h: 2 },
  { i: 'controls', x: 1, y: 2, w: 1, h: 2 },
  { i: 'map', x: 1, y: 5, w: 1, h: 4 },
  { i: 'gap_analysis', x: 2, y: 4, w: 1, h: 4 },
  { i: 'cameras', x: 3, y: 0, w: 1, h: 2 },
  { i: 'respiration', x: 0, y: 6, w: 1, h: 2 },
  { i: 'stress', x: 0, y: 8, w: 1, h: 2 },
  { i: 'conditions', x: 3, y: 2, w: 1, h: 2 },
  { i: 'quick_graph', x: 1, y: 9, w: 3, h: 2 },
];

export function buildPointFromWs(
  tel: VehicleTelemetry,
  bio: DriverBiometric | null,
  prev: EngineeringTelemetryPoint
): EngineeringTelemetryPoint {
  const parsedTime = Date.parse(tel.timestamp);
  return {
    timestamp: new Date(
      isNaN(parsedTime) ? Date.now() : parsedTime
    ).toLocaleTimeString('en-GB', { hour12: false }),
    originalTime: isNaN(parsedTime) ? Date.now() : parsedTime,
    heartRate: bio?.heartRate ?? prev.heartRate,
    respiration: bio?.respiration ?? prev.respiration,
    stressLevel: bio?.stressLevel ?? prev.stressLevel,
    steering: tel.steering,
    throttle: tel.throttle,
    brake: tel.brake,
    gLat: tel.gLat,
    gLong: tel.gLong,
    heading: tel.heading,
    speed: tel.speed,
    rpm: tel.rpm,
    oilTemp: tel.oilTemp,
    fuel: tel.fuel,
    lambda: tel.lambda,
    boost: tel.boost,
    drs: tel.drs,
    tires: tel.tires ?? prev.tires,
    airTemp: prev.airTemp,
    humidity: prev.humidity,
    windSpeed: prev.windSpeed,
    pressure: prev.pressure,
    airflow: tel.airflow,
    ignitionTiming: tel.ignitionTiming,
  };
}
