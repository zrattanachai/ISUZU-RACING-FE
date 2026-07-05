'use client';

import React from 'react';
import { Cloud } from 'lucide-react';

export interface ConditionsWidgetProps {
  airTemp: number;
  humidity: number;
  windSpeed: number;
  pressure: number;
}

export const ConditionsWidget: React.FC<ConditionsWidgetProps> = ({
  airTemp,
  humidity,
  windSpeed,
  pressure,
}) => (
  <div className="glass-panel flex h-full flex-col justify-between rounded-xl border border-white/5 bg-[#080808] p-3 shadow-inner">
    <div className="mb-2 flex items-center gap-1.5 text-[9px] font-bold tracking-wider text-zinc-500 uppercase italic">
      <Cloud className="h-3 w-3" /> Conditions
    </div>
    <div className="grid h-full grid-cols-2 gap-2">
      <div className="flex flex-col justify-between rounded border border-white/5 bg-white/5 p-3">
        <div className="text-[8px] font-bold text-zinc-500 uppercase">
          Air Temp
        </div>
        <div className="text-accent text-xl font-bold">
          {airTemp.toFixed(1)}
          <span className="ml-1 text-xs font-light">°C</span>
        </div>
      </div>
      <div className="flex flex-col justify-between rounded border border-white/5 bg-white/5 p-3">
        <div className="text-[8px] font-bold text-zinc-500 uppercase">
          Humidity
        </div>
        <div className="text-xl font-bold text-blue-400">
          {Math.round(humidity)}
          <span className="ml-1 text-xs font-light">%</span>
        </div>
      </div>
      <div className="flex flex-col justify-between rounded border border-white/5 bg-white/5 p-3">
        <div className="text-[8px] font-bold text-zinc-500 uppercase">
          Wind Speed
        </div>
        <div className="text-xl font-bold text-cyan-400">
          {Math.round(windSpeed)}
          <span className="ml-1 text-xs font-light">km/h</span>
        </div>
      </div>
      <div className="flex flex-col justify-between rounded border border-white/5 bg-white/5 p-3">
        <div className="text-[8px] font-bold text-zinc-500 uppercase">
          Pressure
        </div>
        <div className="text-xl font-bold text-amber-300">
          {Math.round(pressure)}
          <span className="ml-1 text-xs font-light">hPa</span>
        </div>
      </div>
    </div>
  </div>
);
