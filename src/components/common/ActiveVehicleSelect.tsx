'use client';

import { ChevronDown } from 'lucide-react';

interface ActiveVehicleOption {
  id: number;
  label: string;
}

interface ActiveVehicleSelectProps {
  value: number;
  displayLabel: string;
  options: ActiveVehicleOption[];
  onChange: (carId: number) => void;
  label?: string;
}

export function ActiveVehicleSelect({
  value,
  displayLabel,
  options,
  onChange,
  label = 'Active Vehicle',
}: ActiveVehicleSelectProps) {
  return (
    <div className="group relative flex min-w-35 items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 transition-colors hover:border-white/20">
      <div className="bg-accent h-2 w-2 animate-pulse rounded-full shadow-[0_0_8px_var(--accent-glow)]"></div>
      <div className="flex flex-col">
        <span className="text-[9px] font-black tracking-wider text-zinc-500 uppercase">
          {label}
        </span>
        <div className="flex cursor-pointer items-center gap-2">
          <span className="max-w-44 truncate font-mono text-sm font-bold text-white uppercase">
            {displayLabel}
          </span>
          <ChevronDown className="h-3 w-3 text-zinc-500" />
        </div>
      </div>
      <select
        aria-label={label}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {options.map((option) => (
          <option
            key={option.id}
            value={option.id}
            className="bg-zinc-900 text-white"
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
