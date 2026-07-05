'use client';

import { AlertTriangle } from 'lucide-react';

import type { SystemAlert } from '@/types/dashboard';

interface AlertsPanelProps {
  alerts: SystemAlert[];
  title?: string;
  onAcknowledgeAll?: () => void | Promise<void>;
  isAcknowledging?: boolean;
}

export function AlertsPanel({
  alerts,
  title = 'Active System Alerts',
  onAcknowledgeAll,
  isAcknowledging = false,
}: AlertsPanelProps) {
  const canAcknowledge = Boolean(onAcknowledgeAll) && alerts.length > 0;

  return (
    <div className="glass-panel flex h-full flex-col rounded-xl border border-white/5 bg-transparent p-4">
      <h3 className="mb-4 flex items-center gap-2 text-xs font-black tracking-widest text-zinc-300 uppercase">
        <AlertTriangle className="text-warning h-4 w-4" />
        {title}
      </h3>
      <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto pr-1">
        {alerts.map((alert) => (
          <div
            key={`${alert.time}-${alert.msg}`}
            className="group cursor-pointer rounded border border-white/10 bg-white/5 p-2.5 transition-all hover:border-white/20 hover:bg-white/10"
          >
            <div className="flex items-start justify-between">
              <span
                className={`text-[10px] leading-tight font-bold tracking-tight uppercase ${
                  alert.severity === 'critical'
                    ? 'text-danger'
                    : alert.severity === 'warning'
                      ? 'text-warning'
                      : 'text-zinc-300'
                }`}
              >
                {alert.msg}
              </span>
            </div>
            <span className="mt-1 block font-mono text-[9px] text-zinc-600 transition-colors group-hover:text-zinc-400">
              {alert.time}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => {
            if (canAcknowledge && onAcknowledgeAll) {
              void onAcknowledgeAll();
            }
          }}
          disabled={!canAcknowledge || isAcknowledging}
          className="border-accent/20 bg-accent/5 text-accent hover:bg-accent w-full rounded border py-2 text-[10px] font-black tracking-widest transition-all hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAcknowledging ? 'ACKNOWLEDGING...' : 'ACKNOWLEDGE ALL'}
        </button>
      </div>
    </div>
  );
}
