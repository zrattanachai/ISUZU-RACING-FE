'use client';

import React from 'react';
import { AlertTriangle, Trash2, Filter, CheckCircle2 } from 'lucide-react';
import type { BreachAlert } from './types';

interface DirectorBreachLogProps {
  alerts: BreachAlert[];
  filterSelectedOnly: boolean;
  onToggleFilter: () => void;
  onClear: () => void;
  onSelectAlert: (alert: BreachAlert) => void;
}

export const DirectorBreachLog: React.FC<DirectorBreachLogProps> = ({
  alerts,
  filterSelectedOnly,
  onToggleFilter,
  onClear,
  onSelectAlert,
}) => {
  return (
    <div className="glass-panel flex h-0 min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-zinc-900/30">
      <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900 p-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-danger h-4 w-4" />
          <span className="text-xs font-bold tracking-wider uppercase">
            Breach Log
          </span>
          <span className="bg-danger rounded-full px-1.5 py-0.5 text-[9px] font-black text-white">
            {alerts.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClear}
            className="rounded bg-zinc-800 p-1.5 text-zinc-500 hover:text-white"
            title="Clear Alerts"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          <button
            onClick={onToggleFilter}
            className={`rounded p-1.5 ${
              filterSelectedOnly
                ? 'bg-info text-white'
                : 'bg-zinc-800 text-zinc-500 hover:text-white'
            }`}
            title="Show selected cars only"
          >
            <Filter className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
        {alerts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-zinc-600">
            <CheckCircle2 className="mb-2 h-7 w-7" />
            <span className="text-xs">No Active Alerts</span>
          </div>
        ) : (
          alerts.map((alert) => (
            <button
              key={alert.id}
              onClick={() => onSelectAlert(alert)}
              className="border-danger w-full cursor-pointer rounded border-l-2 bg-black/40 p-2 text-left transition-colors hover:bg-black/60"
              title="Jump to this incident"
            >
              <div className="mb-1 flex items-start justify-between">
                <span className="rounded bg-zinc-800 px-1 text-[10px] font-black text-white">
                  CAR {alert.carNumber}
                </span>
                <span className="font-mono text-[9px] text-zinc-500">
                  {alert.timestamp}
                </span>
              </div>
              <div className="text-xs text-zinc-300">
                {alert.metric.toUpperCase()} Breach: {Math.round(alert.value)}{' '}
                (Limit: {alert.threshold})
              </div>
              <div className="mt-1 flex gap-2 font-mono text-[9px] text-zinc-500">
                <span>tick {alert.tick}</span>
                <span>•</span>
                <span>{alert.curve}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
