'use client';

import React from 'react';
import { Flag } from 'lucide-react';

interface StatusPanelProps {
  position: string;
  lap: number;
  totalLaps: number;
  currentTime: string;
  bestTime: string;
}

export const StatusPanel: React.FC<StatusPanelProps> = ({
  position,
  lap,
  totalLaps,
  currentTime,
  bestTime,
}) => {
  return (
    <div className="glass-panel flex h-full flex-col justify-between rounded-xl border border-white/5 bg-[#080808] p-2">
      <div className="mb-0.5 flex items-start justify-between">
        <div className="flex items-center gap-1.5 text-[8px] font-bold tracking-wider text-zinc-500 uppercase italic">
          <Flag className="h-2.5 w-2.5" /> Status
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center py-1 text-center">
        <div className="text-4xl font-black tracking-tighter text-white italic drop-shadow-[0_0_16px_rgba(255,255,255,0.08)]">
          {position}
        </div>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-[8px] font-bold text-zinc-500 uppercase">
            Lap
          </span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-sm font-light text-white">{lap}</span>
            <span className="text-[9px] text-zinc-600">/{totalLaps}</span>
          </div>
        </div>

        <div className="flex flex-col text-right">
          <span className="text-[8px] font-bold text-zinc-500 uppercase">
            Times
          </span>
          <div className="font-mono text-xs leading-none font-bold tracking-tight text-white">
            {currentTime}
          </div>
          <div className="mt-0.5 font-mono text-[7px] text-zinc-600">
            {bestTime}
          </div>
        </div>
      </div>
    </div>
  );
};
