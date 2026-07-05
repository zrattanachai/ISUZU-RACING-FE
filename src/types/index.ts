import type { SensorDefinition } from './dashboard';

export interface TelemetryPoint {
  time: string;
  speed: number;
  rpm: number;
  gear: number;
  throttle: number;
  brake: number;
}

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assignee: string;
  dueDate?: string;
  attachment?: string;
}

export interface Message {
  id: string;
  sender: string;
  role: 'engineer' | 'manager' | 'driver';
  content: string;
  timestamp: string;
}

export interface User {
  id: string;
  name: string;
  role: string;
  avatar: string;
}

export interface Car {
  id: number;
  model: string;
  number: string;
  status: string;
  color?: string;
}

export interface Driver {
  id: number;
  name: string;
  carId: number;
  license: string;
}

export interface CarTelemetry {
  id: number;
  number: string;
  lap: number;
  speed: number;
  rpm: number;
  fuelFlow: number;
  fuelPressure: number;
  boost: number;
  throttle: number;
  brake: number;
  gLat: number;
  gLong: number;
  ignitionTiming: number;
  lambda: number;
  airflow: number;
  distance: number;
  [key: string]: unknown;
}

export interface FileItem {
  id: string;
  parentId: string;
  name: string;
  type: 'folder' | 'csv' | 'mp4' | 'zip';
  size?: string;
  date: string;
  downloadUrl?: string;
}

export interface Thresholds {
  speed: number;
  rpm: number;
  fuelFlow: number;
  fuelPressure: number;
  boost: number;
  throttle: number;
  brake: number;
  gLat: number;
  gLong: number;
  ignitionTiming: number;
  airflow: number;
  lambda: number;
  sensitivity: number;
}

// ---------------------------------------------------------------------------
// Realtime WebSocket shared data models
// ---------------------------------------------------------------------------

/** Channel names used by all WebSocket subscriptions. */
export type WsChannel =
  | 'vehicle.telemetry'
  | 'vehicle.alert'
  | 'vehicle.status'
  | 'vehicle.location'
  | 'vehicle.biometric'
  | 'vehicle.anomaly'
  | 'vehicle.sensors';

/** Payload sent by the client to subscribe / unsubscribe from a channel. */
export interface WsSubscribePayload {
  channel: WsChannel;
  vehicleId?: number;
  driverId?: number;
  eventId?: string;
}

/**
 * Canonical realtime telemetry frame delivered on `vehicle.telemetry`.
 * All live sensor pages consume this model — do not duplicate it locally.
 */
export interface VehicleTelemetry {
  vehicleId: number;
  driverId: number;
  timestamp: string; // ISO-8601
  /** Backend-provided cumulative race distance in meters. */
  distanceMeters?: number;
  speed: number; // km/h
  rpm: number;
  fuel: number; // litres remaining
  fuelPressure: number; // bar
  oilTemp: number; // °C
  throttle: number; // %
  brake: number; // %
  gear: number;
  lambda: number;
  boost: number; // bar
  drs: boolean;
  gLat: number; // lateral g
  gLong: number; // longitudinal g
  heading: number; // degrees
  steering: number; // degrees, negative = left, positive = right
  airflow: number; // Mass Air Flow, g/s
  ignitionTiming: number; // degrees advance BTDC
  tires: {
    fl: TireTelemetry;
    fr: TireTelemetry;
    rl: TireTelemetry;
    rr: TireTelemetry;
  };
}

export interface TireTelemetry {
  speed: number;
  temp: number; // °C
  press: number; // bar
  brake: number; // °C
}

/** Biometric data delivered on `vehicle.biometric`. */
export interface DriverBiometric {
  driverId: number;
  vehicleId: number;
  timestamp: string;
  heartRate: number; // BPM
  respiration: number; // breaths per minute
  stressLevel: number; // 0–100
}

/** Alert event delivered on `vehicle.alert`. */
export interface VehicleAlert {
  alertId: string;
  vehicleId: number;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

/** Vehicle GPS + race position delivered on `vehicle.location`. */
export interface VehicleLocation {
  vehicleId: number;
  timestamp: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  lap: number;
  lapProgress: number; // 0–1
  /** Continuous lap progress, e.g. lap 12 + 0.35 => 12.35 */
  progressContinuous?: number;
  /** Track length in meters for distance-based comparisons. */
  trackLengthMeters?: number;
}

/** Connection & race status delivered on `vehicle.status`. */
export interface VehicleStatus {
  vehicleId: number;
  driverId: number;
  connectionState: 'synchronized' | 'degraded' | 'offline';
  latencyMs: number;
  position: string; // e.g. "P1"
  positionNumber?: number;
  deltaToAheadMeters?: number;
  deltaToLeaderMeters?: number;
  lap: number;
  totalLaps: number;
  currentTime: string;
  bestTime: string;
  timestamp: string;
}

/** Per-metric anomaly summary inside a WsVehicleAnomaly frame. */
export interface MetricAnomalySummary {
  /** Latest measured value for this metric. */
  value: number;
  /** Threshold configured in Administration for this metric. */
  threshold: number;
  /** Completed violation events (sustained breach >= alertDelay seconds each). */
  violations: number;
  /** Punishment events (incremented every warningPenalty violations). */
  anomalies: number;
  /** True when value > threshold but alertDelay window has not yet elapsed. */
  isBreaching: boolean;
  stats: { min: number; max: number };
}

/**
 * Per-vehicle anomaly summary delivered on `vehicle.anomaly` at 1 Hz.
 * All counting is performed by the backend — do NOT recompute client-side.
 */
export interface WsVehicleAnomaly {
  vehicleId: number;
  timestamp: string;
  /** Sum of violations across all tracked metrics. */
  totalViolations: number;
  /** Sum of anomaly/punishment events across all tracked metrics. */
  totalAnomalies: number;
  metrics: {
    rpm?: MetricAnomalySummary;
    speed?: MetricAnomalySummary;
    throttle?: MetricAnomalySummary;
    lambda?: MetricAnomalySummary;
    fuelPressure?: MetricAnomalySummary;
    boost?: MetricAnomalySummary;
    brake?: MetricAnomalySummary;
    gLat?: MetricAnomalySummary;
    gLong?: MetricAnomalySummary;
    airflow?: MetricAnomalySummary;
    ignitionTiming?: MetricAnomalySummary;
    [key: string]: MetricAnomalySummary | undefined;
  };
}

// ---------------------------------------------------------------------------
// Alert Threshold configuration (Settings page → syncs to all sensor pages)
// ---------------------------------------------------------------------------

export interface AlertThreshold {
  id: string;
  metric: string; // machine key, e.g. 'engineTemp'
  label: string; // human label, e.g. 'Engine Temp'
  unit: string; // e.g. '°C'
  warningValue: number;
  criticalValue: number;
}

export type AlertThresholds = Record<string, AlertThreshold>;

// ---------------------------------------------------------------------------
// Director anomaly threshold configuration (Administration page → backend)
// ---------------------------------------------------------------------------

/** Per-metric threshold config pushed to the backend from the Administration page. */
export interface DirectorThresholdMetric {
  /** Value limit — metric must exceed this to start breach timing. */
  threshold: number;
  /** Seconds of continuous breach before 1 violation is counted (alertDelay). */
  alertDelay: number;
  /** Number of violations that trigger 1 anomaly/punishment (warningPenalty). */
  warningPenalty: number;
}

/** Full threshold config for all tracked director metrics. */
export type DirectorThresholdsConfig = Record<string, DirectorThresholdMetric>;

/** GET /director/thresholds response envelope. */
export interface DirectorThresholdsResponse {
  thresholds: DirectorThresholdsConfig;
  updatedAt?: string;
}

/** GET /director/refresh-rate response envelope. */
export interface DirectorRefreshRateResponse {
  refreshRateHz: number;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Recording session (Files & Video page)
// ---------------------------------------------------------------------------

export type RecordingStatus = 'pending' | 'processing' | 'ready' | 'error';
export type RecordingSourcePage = 'ENGINEERING' | 'DIRECTOR';

export interface RecordingSession {
  id: string;
  vehicleId: number;
  sessionName: string;
  startDate: string; // ISO-8601
  endDate: string; // ISO-8601
  status: RecordingStatus;
  fileCount: number;
  createdAt: string;
  targetFolderId?: string;
  downloadUrl?: string;
  archiveFileName?: string;
  sourcePage?: RecordingSourcePage;
  requestedBy?: string;
}

export interface CreateRecordingRequest {
  vehicleId: number;
  sessionName: string;
  startDate: string;
  endDate: string;
  targetFolderId?: string;
  createFolderName?: string;
  sourcePage?: RecordingSourcePage;
  requestedBy?: string;
}

export interface CreateScopedRecordingRequest {
  sessionName: string;
  startDate: string;
  endDate: string;
  targetFolderId?: string;
  createFolderName?: string;
  sourcePage?: RecordingSourcePage;
  requestedBy?: string;
}

export interface RecordingDownloadResponse {
  recordingId: string;
  status: RecordingStatus;
  url?: string;
  expiresAt?: string;
  fileName?: string;
}

export interface FileTreeResponse {
  files: FileItem[];
}

export interface LogReportRow {
  id: number;
  createTime: string;
  name: string;
  device: number;
  car: string;
  datetime: string;
  lat: number;
  lon: number;
  speed: number;
  x: number;
  y: number;
  z: number;
  magX: number;
  magY: number;
  magZ: number;
  gyX: number;
  gyY: number;
  gyZ: number;
  map: number;
  lambda: number;
  even: string;
  class: string;
  hr: number;
  dutyInjection: number;
  coolantTemp: number;
  fuelFlowRate: number;
  fuelRailPressure: number;
  oilPressure: number;
  oilTemp: number;
  rpm: number;
  sat: number;
  airTemp: number;
  speedFl: number;
  speedFr: number;
  speedRl: number;
  speedRr: number;
  batteryVolatge: number;
  drs: number;
  throttle: number;
  lap: number;
  fuelRailPressureWarning: number;
  fuelRailPressurePenalty: number;
  throttleWarning: number;
  throttlePenalty: number;
  ignitionTimeingWarning: number;
  ignitionTimeingPenalty: number;
  lambdaWarning: number;
  lambdaPenalty: number;
  airWarning: number;
  airPenalty: number;
  speedWarning: number;
  speedPenalty: number;
  rpmWarning: number;
  rpmPenalty: number;
}

export interface LogReportQuery {
  from?: string;
  to?: string;
  car?: string;
  name?: string;
  event?: string;
  className?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'datetime' | 'createTime';
  sortOrder?: 'asc' | 'desc';
}

export interface LogReportResponse {
  rows: LogReportRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DeleteFileRequest {
  password: string;
}

export interface DeleteFileResponse {
  deletedIds: string[];
  deletedRecordingIds?: string[];
}

export interface ImportFileResponse {
  imported: boolean;
  file: FileItem;
}

// ---------------------------------------------------------------------------
// Administration entities
// ---------------------------------------------------------------------------

export interface RaceEvent {
  id: string;
  name: string;
  track: string;
  sessionType: 'PRACTICE' | 'QUALIFYING' | 'RACE' | 'TEST';
  scheduledAt: string; // ISO-8601
  status: 'upcoming' | 'active' | 'completed';
}

export interface Garage {
  id: string;
  name: string;
  location: string;
  teamId: string;
  assignedCarIds: number[];
}

export interface AdminUser {
  id: string;
  name: string;
  role: string;
  email: string;
  access: 'Admin' | 'Director' | 'Engineer' | 'Competitor';
  assignedCarIds?: number[];
}

/** Realtime sensor display frame delivered on `vehicle.sensors` at 2 Hz. */
export interface VehicleSensorUpdate {
  vehicleId: number;
  timestamp: string;
  sensorCategories: Record<
    'POWERTRAIN' | 'CHASSIS' | 'AERO' | 'ELECTRONICS',
    SensorDefinition[]
  >;
}
