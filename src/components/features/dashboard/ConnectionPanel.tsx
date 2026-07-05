'use client';

import { Wifi, WifiOff } from 'lucide-react';

interface ConnectionPanelProps {
  state: 'synchronized' | 'degraded' | 'offline';
  latencyMs: number;
  boxName?: string;
  firmwareVersion?: string;
  isLoading?: boolean;
}

export function ConnectionPanel({
  state,
  latencyMs,
  boxName,
  firmwareVersion,
  isLoading = false,
}: ConnectionPanelProps) {
  const isOnline = state === 'synchronized' || state === 'degraded';
  const stateColor =
    state === 'synchronized'
      ? 'text-success'
      : state === 'degraded'
        ? 'text-warning'
        : 'text-danger';
  const dotColor =
    state === 'synchronized'
      ? 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.4)]'
      : state === 'degraded'
        ? 'bg-warning shadow-[0_0_8px_rgba(251,191,36,0.4)]'
        : 'bg-danger shadow-[0_0_8px_rgba(239,68,68,0.4)]';
  const stateLabel =
    state === 'synchronized'
      ? 'Synchronized'
      : state === 'degraded'
        ? 'Degraded'
        : 'Offline';

  return (
    <div className="glass-panel flex h-full flex-col rounded-xl border border-white/5 bg-transparent p-5">
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-white/5 p-2 shadow-inner">
          {isOnline ? (
            <Wifi className={`h-5 w-5 ${stateColor}`} />
          ) : (
            <WifiOff className="text-danger h-5 w-5" />
          )}
        </div>
        <div>
          <h3 className="text-sm font-black tracking-tight text-white uppercase">
            Uplink
          </h3>
          <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
            Telemetry status
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded border border-white/10 bg-white/5 p-3">
          <span className="text-[10px] font-black text-zinc-500 uppercase">
            Link State
          </span>
          {isLoading ? (
            <span className="text-[10px] font-black text-zinc-500 uppercase">
              Loading...
            </span>
          ) : (
            <span
              className={`flex items-center gap-1.5 text-[10px] font-black uppercase ${stateColor}`}
            >
              <div
                className={`h-1.5 w-1.5 animate-pulse rounded-full ${dotColor}`}
              />
              {stateLabel}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between rounded border border-white/10 bg-white/5 p-3">
          <span className="text-[10px] font-black text-zinc-500 uppercase">
            Latency
          </span>
          <span className="font-mono text-[10px] font-black text-white">
            {isLoading ? '---' : `${latencyMs} ms`}
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-[9px] font-black tracking-widest text-zinc-600 uppercase">
            Active Box
          </label>
          <div className="flex items-center justify-between rounded border border-white/10 bg-black/40 px-3 py-2.5 font-mono text-xs text-white shadow-inner">
            <span className="tracking-tighter">
              {isLoading ? '—' : (boxName ?? '—')}
            </span>
            <span className="text-[10px] text-zinc-600">
              {isLoading ? '' : (firmwareVersion ?? '')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
