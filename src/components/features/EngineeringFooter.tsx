'use client';

import React from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface EngineeringFooterProps {
  isPaused: boolean;
  onTogglePause: () => void;
  playbackIndex: number;
  historyLength: number;
  onScrub: (val: number) => void;
  timestamp: string;
  onResumeLive: () => void;
}

export const EngineeringFooter: React.FC<EngineeringFooterProps> = ({
  isPaused,
  onTogglePause,
  playbackIndex,
  historyLength,
  onScrub,
  timestamp,
  onResumeLive,
}) => {
  return (
    <div className="absolute bottom-0 left-0 w-full h-16 glass-panel border-t border-white/10 bg-black/90 flex items-center px-6 gap-4 z-50">
      <button 
        onClick={onTogglePause} 
        className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors flex-shrink-0"
      >
        {isPaused ? <Play className="w-4 h-4 text-white ml-1" /> : <Pause className="w-4 h-4 text-white" />}
      </button>
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
          <span>SESSION START</span>
          <span className="text-accent">{isPaused ? "PLAYBACK PAUSED" : "LIVE FEED"}</span>
          <span>NOW</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max={Math.max(0, historyLength - 1)} 
          value={playbackIndex} 
          onInput={(e) => onScrub(Number(e.currentTarget.value))}
          onChange={(e) => onScrub(Number(e.target.value))} 
          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-accent hover:accent-accent/80" 
        />
      </div>
      <div className="text-right min-w-[80px]">
        <div className="text-xl font-mono text-white font-light">{timestamp || "--:--:--"}</div>
        {isPaused && (
          <button 
            onClick={onResumeLive} 
            className="text-[10px] text-accent hover:text-white flex items-center justify-end gap-1 w-full mt-1"
          >
            <RotateCcw className="w-3 h-3" /> RETURN TO LIVE
          </button>
        )}
      </div>
    </div>
  );
};
