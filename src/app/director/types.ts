import type { DirectorMetricKey } from '@/lib/director';
import type React from 'react';
import {
  Zap,
  Gauge,
  Activity,
  MoveHorizontal,
  MoveVertical,
  CircleGauge,
} from 'lucide-react';

export type RaceStatus = 'GREEN' | 'YELLOW' | 'SC' | 'RED';
export type RightPanelPage = 'DIRECTOR' | 'MAP';

export interface BreachAlert {
  id: string;
  carId: number;
  carNumber: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: string;
  sourceTs: number;
  tick: number;
  curve: string;
  snapshot: {
    speed: number;
    rpm: number;
    throttle: number;
    boost: number;
    lambda: number;
    gLat: number;
    gLong: number;
    brake: number;
    distance?: number;
  };
}

export interface MetricRuntimeRule {
  alertDelay: number;
  penaltyThreshold: number;
}

export const DEFAULT_METRIC_RULE: MetricRuntimeRule = {
  alertDelay: 1,
  penaltyThreshold: 3,
};

export const METRIC_ICON_BY_KEY: Record<DirectorMetricKey, React.ElementType> =
  {
    speed: Zap,
    rpm: Gauge,
    throttle: Zap,
    boost: Gauge,
    lambda: Activity,
    gLat: MoveHorizontal,
    gLong: MoveVertical,
    brake: CircleGauge,
  };

export interface DisplayCar {
  id: number;
  number: string;
  model: string;
  color?: string;
  status: 'OK' | 'WARN' | 'CRITICAL';
  hasBackendViolation?: boolean;
  hasBackendAnomaly?: boolean;
}
