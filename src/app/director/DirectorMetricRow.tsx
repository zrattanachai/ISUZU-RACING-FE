'use client';

import React from 'react';
import { CheckCircle2, ChevronDown, Save, Settings } from 'lucide-react';
import { TelemetryChart } from '@/components/features/TelemetryChart';
import type {
  MetricDefinition,
  TelemetryDataPoint,
} from '@/components/features/TelemetryChart';
import type { DirectorMetricKey } from '@/lib/director';
import { DIRECTOR_METRICS } from '@/lib/director';
import { METRIC_ICON_BY_KEY } from './types';
import type { MetricRuntimeRule } from './types';
// DEFAULT_METRIC_RULE is used by the parent page when initialising props

interface DirectorMetricRowProps {
  metric: MetricDefinition;
  metricIndex: number;
  thresholdValue: number;
  metricRule: MetricRuntimeRule;
  isSettingsOpen: boolean;
  onToggleSettings: () => void;
  onCloseSettings: () => void;
  onMetricChange: (index: number, key: DirectorMetricKey) => void;
  onThresholdChange: (key: string, value: number) => void;
  onRuleChange: (
    key: string,
    field: keyof MetricRuntimeRule,
    value: number
  ) => void;
  onSaveThresholds: () => void;
  isSavingThresholds?: boolean;
  thresholdSaveStatus?: 'idle' | 'saved' | 'error';
  graphData: TelemetryDataPoint[];
  graphResetKey?: string;
  compareDistanceDomain?: [number, number];
  selectedCarIds: number[];
  isCompareMode: boolean;
  currentVal: number;
  activeMetricKeys: DirectorMetricKey[];
  allowSettings?: boolean;
  violationCount?: number;
  penaltyCount?: number;
  showCounts?: boolean;
}

export const DirectorMetricRow: React.FC<DirectorMetricRowProps> = ({
  metric,
  metricIndex,
  thresholdValue,
  metricRule,
  isSettingsOpen,
  onToggleSettings,
  onCloseSettings,
  onMetricChange,
  onThresholdChange,
  onRuleChange,
  onSaveThresholds,
  isSavingThresholds = false,
  thresholdSaveStatus = 'idle',
  graphData,
  graphResetKey,
  compareDistanceDomain,
  selectedCarIds,
  isCompareMode,
  currentVal,
  activeMetricKeys,
  allowSettings = true,
  violationCount = 0,
  penaltyCount = 0,
  showCounts = false,
}) => {
  const Icon = METRIC_ICON_BY_KEY[metric.key as DirectorMetricKey];

  return (
    <div className="glass-panel bg-surface/20 relative z-auto flex min-h-0 flex-1 flex-col rounded-xl border border-white/5 px-3 py-2">
      {allowSettings && isSettingsOpen && (
        <div className="absolute top-9 right-2 z-60 w-64 rounded-lg border border-white/20 bg-[#0a0a0a] p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
            <span className="text-[10px] font-bold tracking-wider uppercase">
              Graph Configuration
            </span>
            <button
              onClick={onCloseSettings}
              className="text-zinc-500 hover:text-white"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold text-zinc-500 uppercase">
                Limit Threshold
              </label>
              <input
                type="number"
                value={thresholdValue}
                onChange={(e) =>
                  onThresholdChange(metric.key, Number(e.target.value))
                }
                className="focus:border-accent w-full rounded border border-white/10 bg-black px-2 py-1 text-xs text-white outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold text-zinc-500 uppercase">
                  Alert Delay
                </label>
                <input
                  type="number"
                  value={metricRule.alertDelay}
                  onChange={(e) =>
                    onRuleChange(
                      metric.key,
                      'alertDelay',
                      Number(e.target.value)
                    )
                  }
                  className="focus:border-accent w-full rounded border border-white/10 bg-black px-2 py-1 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-zinc-500 uppercase">
                  Penalty Times
                </label>
                <input
                  type="number"
                  value={metricRule.penaltyThreshold}
                  onChange={(e) =>
                    onRuleChange(
                      metric.key,
                      'penaltyThreshold',
                      Number(e.target.value)
                    )
                  }
                  className="focus:border-accent w-full rounded border border-white/10 bg-black px-2 py-1 text-xs text-white outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onSaveThresholds}
              disabled={isSavingThresholds}
              className="bg-isuzu-red/15 hover:bg-isuzu-red/25 mt-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded border border-white/10 px-3 py-2 text-[10px] font-black tracking-widest text-white uppercase transition-all hover:border-white/20 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-300"
            >
              {thresholdSaveStatus === 'saved' ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {isSavingThresholds
                ? 'Saving...'
                : thresholdSaveStatus === 'saved'
                  ? 'Saved'
                  : thresholdSaveStatus === 'error'
                    ? 'Retry Save'
                    : 'Save Thresholds'}
            </button>
          </div>
        </div>
      )}

      <div className="mb-1 flex shrink-0 items-center justify-between px-1">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center gap-2">
            <Icon className="h-3 w-3" style={{ color: metric.color }} />
            <div className="relative">
              <select
                value={metric.key}
                onChange={(e) =>
                  onMetricChange(
                    metricIndex,
                    e.target.value as DirectorMetricKey
                  )
                }
                className="hover:text-accent cursor-pointer appearance-none bg-transparent pr-4 text-xs font-bold tracking-wider text-white uppercase transition-colors outline-none"
              >
                {DIRECTOR_METRICS.filter(
                  (m) =>
                    m.key === metric.key ||
                    !activeMetricKeys.includes(m.key as DirectorMetricKey)
                ).map((m) => (
                  <option
                    key={m.key}
                    value={m.key}
                    className="bg-zinc-900 text-white"
                  >
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-0 h-3 w-3 -translate-y-1/2 text-zinc-500" />
            </div>
          </div>
          {allowSettings && (
            <div className="flex items-center gap-2 border-l border-white/10 pl-2 text-[10px] text-zinc-500">
              <span>
                LIMIT:{' '}
                <span className="font-mono text-zinc-300">
                  {thresholdValue}
                </span>{' '}
                {metric.unit}
              </span>
            </div>
          )}
          {showCounts && (
            <div className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase">
              <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-amber-300">
                WARN {violationCount}
              </span>
              <span className="rounded border border-orange-500/30 bg-orange-500/10 px-1.5 py-0.5 text-orange-300">
                PEN {penaltyCount}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-mono text-[10px] font-bold tracking-wider text-orange-400 uppercase">
              ◉ REALTIME
            </span>
          </div>
          {allowSettings && (
            <button
              onClick={onToggleSettings}
              className="rounded p-1.5 text-zinc-600 transition-colors hover:bg-white/10"
            >
              <Settings className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex min-h-0 w-full flex-1 items-center gap-4">
        <TelemetryChart
          key={graphResetKey ? `${metric.key}-${graphResetKey}` : metric.key}
          data={graphData}
          metric={{ ...metric, threshold: thresholdValue }}
          selectedCarIds={selectedCarIds}
          compareMode={isCompareMode}
          xAxisMode={isCompareMode ? 'distance' : 'time'}
          xAxisDistanceCarId={selectedCarIds[0]}
          xAxisDistanceDomain={
            isCompareMode ? compareDistanceDomain : undefined
          }
        />
        <div className="flex h-full w-28 shrink-0 flex-col items-end justify-center rounded-r-lg border-l border-white/5 bg-white/2 pr-2 pl-2">
          <span className="mb-0.5 text-[9px] font-bold text-zinc-500 uppercase">
            CURRENT
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl leading-none font-black tracking-tighter text-white">
              {metric.key === 'lambda'
                ? (typeof currentVal === 'number' ? currentVal : 0).toFixed(2)
                : Math.round(typeof currentVal === 'number' ? currentVal : 0)}
            </span>
            <span className="text-[10px] font-bold text-zinc-500">
              {metric.unit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
