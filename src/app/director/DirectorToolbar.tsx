'use client';

import React from 'react';
import { Radio, Square } from 'lucide-react';
import { DIRECTOR_WINDOW_OPTIONS } from '@/lib/director';
import type { DisplayCar } from './types';

interface DirectorToolbarProps {
  carsCount: number;
  visibleWindow: number;
  onWindowChange: (value: number) => void;
  displayCars: DisplayCar[];
  selectedCarIds: number[];
  onToggleCarSelection: (carId: number) => void;
  isCompareMode: boolean;
  onToggleCompare: () => void;
  compareDataMode: 'LIVE' | 'LAP';
  onCompareDataModeChange: (mode: 'LIVE' | 'LAP') => void;
  selectedCompareLap: number;
  onSelectedCompareLapChange: (lap: number) => void;
  totalLaps: number;
  recState: 'IDLE' | 'RACING' | 'SAVING';
  recordingDuration: string;
  selectedPrimaryCarId: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  allowRecording?: boolean;
  graphCount: number;
  onGraphCountChange: (count: number) => void;
}

export const DirectorToolbar: React.FC<DirectorToolbarProps> = ({
  carsCount,
  visibleWindow,
  onWindowChange,
  displayCars,
  selectedCarIds,
  onToggleCarSelection,
  isCompareMode,
  onToggleCompare,
  compareDataMode,
  onCompareDataModeChange,
  selectedCompareLap,
  onSelectedCompareLapChange,
  totalLaps,
  recState,
  recordingDuration,
  selectedPrimaryCarId,
  onStartRecording,
  onStopRecording,
  allowRecording = true,
  graphCount,
  onGraphCountChange,
}) => {
  const getStatusClasses = (
    status: 'OK' | 'WARN' | 'CRITICAL',
    carId: number,
    hasBackendViolation?: boolean,
    hasBackendAnomaly?: boolean
  ) => {
    const selected = selectedCarIds.includes(carId);
    const baseSelected = selected
      ? 'z-10 scale-110 ring-2 ring-inset ring-white'
      : 'opacity-60 hover:opacity-100';

    if (hasBackendAnomaly || status === 'CRITICAL')
      return `${baseSelected} border-danger bg-danger/80 text-white`;
    if (hasBackendViolation)
      return `${baseSelected} border-yellow-300/70 bg-yellow-300 text-black`;
    if (status === 'WARN')
      return `${baseSelected} border-warning bg-warning text-black`;
    return `${baseSelected} border-white/5 bg-zinc-800 text-zinc-300`;
  };

  return (
    <div className="glass-panel bg-surface/50 flex shrink-0 flex-col gap-3 rounded-xl border border-white/10 px-4 py-3">
      <div className="flex min-h-10 items-center gap-4">
        <div className="flex min-w-40 flex-col justify-center border-r border-white/10 pr-4">
          <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
            Grid Status
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-black text-white">{carsCount}</span>
            <span className="text-xs text-zinc-400">Cars Active</span>
          </div>
        </div>

        <div className="flex items-center gap-2 border-r border-white/10 pr-4">
          <span className="mr-2 text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
            Window
          </span>
          <div className="flex rounded-lg border border-white/5 bg-black/40 p-1">
            {DIRECTOR_WINDOW_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => onWindowChange(opt.value)}
                className={`rounded px-3 py-1 text-[10px] font-bold transition-all ${
                  visibleWindow === opt.value
                    ? 'bg-accent text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 border-r border-white/10 pr-4">
          <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
            Graphs
          </span>
          <div className="flex rounded-lg border border-white/5 bg-black/40 p-1">
            {[1, 2, 3, 4, 5].map((count) => (
              <button
                key={count}
                onClick={() => onGraphCountChange(count)}
                className={`rounded px-2.5 py-1 text-[10px] font-bold transition-all ${
                  graphCount === count
                    ? 'bg-accent text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onToggleCompare}
          className={`rounded-md border px-3 py-1 text-[10px] font-black tracking-widest ${
            isCompareMode
              ? 'border-info bg-info/20 text-info'
              : 'border-white/10 bg-black/40 text-zinc-400 hover:text-white'
          }`}
        >
          {isCompareMode ? 'COMPARE ON' : 'COMPARE'}
        </button>

        {isCompareMode ? (
          <div className="flex items-center gap-2 border-l border-white/10 pl-4">
            <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
              Source
            </span>
            <select
              value={compareDataMode}
              onChange={(event) =>
                onCompareDataModeChange(event.target.value as 'LIVE' | 'LAP')
              }
              className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-black tracking-widest text-white outline-none"
            >
              <option value="LIVE" className="bg-zinc-900">
                LIVE
              </option>
              <option value="LAP" className="bg-zinc-900">
                LAP
              </option>
            </select>
            {compareDataMode === 'LAP' ? (
              <select
                value={selectedCompareLap}
                onChange={(event) =>
                  onSelectedCompareLapChange(Number(event.target.value))
                }
                className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-black tracking-widest text-white outline-none"
              >
                {Array.from({ length: Math.max(totalLaps, 1) }, (_, index) => (
                  <option
                    key={index + 1}
                    value={index + 1}
                    className="bg-zinc-900"
                  >
                    LAP {index + 1}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        ) : null}

        {allowRecording && (
          <div className="ml-auto flex items-center gap-2 border-l border-white/10 pl-4">
            <span
              className={`font-mono text-[10px] font-bold tracking-widest ${
                recState === 'RACING' ? 'text-danger' : 'text-zinc-500'
              }`}
            >
              {recState === 'RACING'
                ? `REC ${recordingDuration}`
                : 'RECORD READY'}
            </span>
            {recState === 'RACING' ? (
              <button
                onClick={onStopRecording}
                className="border-danger bg-danger/20 text-danger inline-flex items-center gap-1 rounded-md border px-3 py-1 text-[10px] font-black tracking-widest"
              >
                <Square className="h-3 w-3" /> STOP
              </button>
            ) : (
              <button
                onClick={onStartRecording}
                disabled={selectedPrimaryCarId <= 0}
                className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-black tracking-widest text-zinc-300 transition-colors enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Radio className="h-3 w-3" /> RECORD
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-t border-white/10 pt-3">
        {displayCars.map((car) => (
          <button
            key={car.id}
            onClick={() => onToggleCarSelection(car.id)}
            className={`relative flex h-8 w-8 flex-col items-center justify-center rounded border transition-all ${getStatusClasses(
              car.status,
              car.id,
              car.hasBackendViolation,
              car.hasBackendAnomaly
            )}`}
          >
            <span className="text-[11px] leading-none font-black">
              {car.number}
            </span>
            {car.hasBackendAnomaly && (
              <span className="bg-danger absolute -top-1 -right-1 h-2 w-2 animate-pulse rounded-full" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
