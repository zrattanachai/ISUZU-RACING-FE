'use client';

import React, { useState } from 'react';
import { Activity, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GapAnalysisPanelProps {
  rivals: Array<{
    number: string;
    name: string;
    gap: number;
    isPos: boolean;
    gapMeters?: number;
    deltaPosition?: number;
    relation?: 'AHEAD' | 'BEHIND';
  }>;
  onAddRival: (number: string) => void;
  onRemoveRival: (number: string) => void;
  selectedLap: number;
  totalLaps: number;
  setSelectedLap: (lap: number) => void;
}

export const GapAnalysisPanel: React.FC<GapAnalysisPanelProps> = ({
  rivals,
  onAddRival,
  onRemoveRival,
  selectedLap,
  totalLaps,
  setSelectedLap,
}) => {
  const [rivalInput, setRivalInput] = useState('');

  const handleAdd = () => {
    if (rivalInput) {
      onAddRival(rivalInput);
      setRivalInput('');
    }
  };

  return (
    <div className="glass-panel relative flex h-full flex-col overflow-hidden rounded-xl border border-white/5 bg-[#080808] p-3">
      <div className="z-10 mb-2 flex items-center justify-between gap-3 pr-16">
        <span className="flex items-center gap-2 text-[10px] font-bold tracking-wider text-zinc-500 uppercase italic">
          <Activity className="h-3 w-3 text-zinc-500" /> Gap Analysis
        </span>

        <div className="flex shrink-0 items-center gap-1 rounded border border-white/5 bg-white/5 px-1.5 py-0.5">
          <span className="font-mono text-[8px] text-zinc-500 uppercase">
            Lap
          </span>
          <select
            className="w-8 cursor-pointer appearance-none bg-transparent text-right text-[10px] font-bold text-white outline-none"
            value={selectedLap}
            onChange={(e) => setSelectedLap(Number(e.target.value))}
          >
            {Array.from({ length: totalLaps }, (_, i) => i + 1).map((lap) => (
              <option key={lap} value={lap} className="bg-black text-white">
                {lap}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-2 flex flex-col gap-1 border-b border-white/10 pb-2">
        <label className="text-[8px] font-bold tracking-widest text-zinc-500 uppercase">
          Compare with Rival #
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Enter Car #"
              value={rivalInput}
              onChange={(e) => setRivalInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              className="focus:border-accent w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white transition-all outline-none"
            />
            {rivalInput && (
              <button
                onClick={() => setRivalInput('')}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-zinc-500 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <button
            onClick={handleAdd}
            className="bg-accent flex items-center gap-1 rounded px-3 py-1.5 text-[10px] font-bold text-white uppercase transition-all hover:opacity-80"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>
      </div>

      <div className="custom-scrollbar flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
        <div className="flex flex-col gap-1">
          <div className="px-1 text-[8px] font-bold text-zinc-600 uppercase">
            Rival Comparison
          </div>
          <div className="space-y-1.5">
            {rivals.length > 0 ? (
              rivals.map((rival) => (
                <div
                  key={rival.number}
                  className="group animate-in fade-in slide-in-from-top-1 flex items-center justify-between rounded border border-white/10 bg-white/5 p-2 duration-300"
                >
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRemoveRival(rival.number)}
                      className="rounded p-1 text-zinc-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="font-mono text-xs font-bold text-zinc-400">
                      #{rival.number}
                    </div>
                    <div className="text-[10px] font-bold text-white uppercase">
                      {rival.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={cn(
                        'font-mono text-sm font-black',
                        rival.relation === 'AHEAD' || rival.isPos
                          ? 'text-red-500'
                          : 'text-green-500'
                      )}
                    >
                      {typeof rival.gapMeters === 'number'
                        ? `${Math.round(rival.gapMeters)}m`
                        : `${rival.isPos ? '+' : ''}${rival.gap.toFixed(3)}s`}
                    </div>
                    {typeof rival.deltaPosition === 'number' && (
                      <div className="font-mono text-[9px] font-bold tracking-wider text-zinc-500 uppercase">
                        {rival.deltaPosition > 0
                          ? `+${rival.deltaPosition} POS`
                          : rival.deltaPosition < 0
                            ? `${rival.deltaPosition} POS`
                            : 'SAME POS'}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center rounded border border-dashed border-white/10 bg-white/5 py-4">
                <span className="text-[10px] text-zinc-600 italic">
                  Enter rival car numbers above to compare
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
