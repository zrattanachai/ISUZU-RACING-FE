import React from 'react';

import type { SensorStatus } from '@/types/dashboard';

export type { SensorStatus } from '@/types/dashboard';

export interface SensorCardProps {
  id?: string;
  name: string;
  value: string | number;
  status: SensorStatus;
  channel?: string;
  isDraggable?: boolean;
}

const StatusIcon = ({ status }: { status: SensorStatus }) => {
  switch (status) {
    case 'ok':
      return (
        <div className="bg-success h-2 w-2 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
      );
    case 'warn':
      return (
        <div className="bg-warning h-2 w-2 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.6)]"></div>
      );
    case 'error':
      return (
        <div className="bg-danger h-2 w-2 rounded-full shadow-[0_0_8px_rgba(255,51,51,0.6)]"></div>
      );
    case 'calib':
      return (
        <div className="bg-info h-2 w-2 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
      );
    case 'offline':
    default:
      return <div className="h-2 w-2 rounded-full bg-zinc-600"></div>;
  }
};

export const SensorCard: React.FC<SensorCardProps> = ({
  name,
  value,
  status,
  channel,
  isDraggable = false,
}) => {
  return (
    <div
      className={`relative flex h-full flex-col gap-2 rounded border border-white/5 bg-black/40 p-3 transition-colors hover:border-white/10 ${
        isDraggable ? 'cursor-move border-dashed border-white/30' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <StatusIcon status={status} />
        {channel && (
          <span className="font-mono text-[10px] text-zinc-600 uppercase">
            {channel}
          </span>
        )}
      </div>
      <div>
        <div
          className="mb-0.5 truncate text-[10px] font-medium tracking-wider text-zinc-500 uppercase"
          title={name}
        >
          {name}
        </div>
        <div className="overflow-hidden font-mono text-lg leading-tight font-bold tracking-tight whitespace-nowrap text-white">
          {value}
        </div>
      </div>
    </div>
  );
};
