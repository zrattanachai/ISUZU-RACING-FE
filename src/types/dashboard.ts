import type { Layout } from 'react-grid-layout';

export type SensorStatus = 'ok' | 'warn' | 'calib' | 'error' | 'offline';

export const SENSOR_CATEGORY_KEYS = [
  'POWERTRAIN',
  'CHASSIS',
  'AERO',
  'ELECTRONICS',
] as const;

export type SensorCategoryKey = (typeof SENSOR_CATEGORY_KEYS)[number];

export interface SensorDefinition {
  name: string;
  status: SensorStatus;
  value: string;
  channel: string;
}

export interface SystemAlert {
  msg: string;
  time: string;
  severity: 'info' | 'warning' | 'critical';
}

export type SensorLayouts = Partial<Record<SensorCategoryKey, Layout>>;
