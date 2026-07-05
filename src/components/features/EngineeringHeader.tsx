'use client';

import React from 'react';
import {
  Play,
  Activity,
  Pause,
  Check,
  LayoutGrid,
  EyeOff,
  ChevronDown,
  Eye,
  Folder,
} from 'lucide-react';
import { ActiveVehicleSelect } from '@/components/common/ActiveVehicleSelect';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';

interface EngineeringHeaderProps {
  isPaused: boolean;
  recState: 'IDLE' | 'RACING' | 'SAVING';
  recordingDuration: string;
  canEditLayout: boolean;
  editMode: boolean;
  setEditMode: (val: boolean) => void;
  hiddenWidgetsCount: number;
  hiddenWidgets: string[];
  onRestoreWidget: (id: string) => void;
  activeRacerId: number;
  activeRacer: { number: string; name: string } | undefined;
  activeRacers: Array<{ id: number; number: string; name: string }>;
  onSetActiveRacer: (id: number) => void;
  onStartRacing: () => void;
  onStopRacing: () => void;
  widgets: Array<{ id: string; title: string }>;
}

export const EngineeringHeader: React.FC<EngineeringHeaderProps> = ({
  isPaused,
  recState,
  recordingDuration,
  canEditLayout,
  editMode,
  setEditMode,
  hiddenWidgetsCount,
  hiddenWidgets,
  onRestoreWidget,
  activeRacerId,
  activeRacer,
  activeRacers,
  onSetActiveRacer,
  onStartRacing,
  onStopRacing,
  widgets,
}) => {
  return (
    <div className="relative z-10 mb-4 flex shrink-0 flex-col">
      <div className="mb-4">
        <PageHeader
          title="Telemetry Data"
          subtitle={
            <>
              <span>REAL-TIME ANALYSIS</span>
              <span className="text-zinc-700">•</span>
              <span>SESSION 4</span>
              <span className="text-zinc-700">|</span>
              {isPaused ? (
                <span className="flex items-center gap-1 font-bold text-yellow-500">
                  <Pause className="h-3 w-3" /> PAUSED
                </span>
              ) : (
                <span className="text-accent flex animate-pulse items-center gap-1 font-bold">
                  <Activity className="h-3 w-3" /> LIVE
                </span>
              )}
            </>
          }
          actions={
            <div className="flex items-center gap-2">
              {recState === 'IDLE' ? (
                <button
                  onClick={onStartRacing}
                  className="relative mr-2 flex items-center justify-center gap-2 overflow-hidden rounded border border-green-500 bg-green-600 px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all duration-300 hover:bg-green-500"
                >
                  <Play className="h-3 w-3 fill-white" />
                  <span>START</span>
                </button>
              ) : recState === 'SAVING' ? (
                <div className="border-accent/40 bg-accent/20 mr-2 flex items-center justify-center gap-2 rounded border px-3 py-1.5 text-xs font-bold text-white">
                  <Folder className="h-3 w-3" />
                  <span>SAVING SESSION...</span>
                </div>
              ) : (
                <div className="mr-2 flex items-center gap-2">
                  <div className="bg-accent border-accent relative flex w-32 animate-pulse items-center justify-center gap-2 overflow-hidden rounded border px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_20px_var(--accent-glow)] transition-all duration-300">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-white"></div>
                    <span>RACING {recordingDuration}</span>
                  </div>
                  <button
                    onClick={onStopRacing}
                    className="flex h-8 w-8 items-center justify-center rounded border border-white/10 bg-zinc-800 transition-colors hover:border-red-500 hover:bg-zinc-700"
                    title="Stop Racing"
                  >
                    <div className="h-2 w-2 rounded-sm bg-red-500"></div>
                  </button>
                </div>
              )}

              {canEditLayout ? (
                <>
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className={cn(
                      'flex items-center gap-2 rounded px-3 py-1.5 text-xs font-bold transition-colors',
                      editMode
                        ? 'bg-accent text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    )}
                  >
                    {editMode ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <LayoutGrid className="h-3 w-3" />
                    )}{' '}
                    {editMode ? 'DONE' : 'EDIT LAYOUT'}
                  </button>
                  <div className="mx-2 h-6 w-px bg-white/10"></div>
                </>
              ) : null}

              {editMode && hiddenWidgetsCount > 0 && (
                <div className="group relative mr-4">
                  <button className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-4 py-1.5 transition-colors hover:bg-white/5">
                    <EyeOff className="h-3 w-3 text-zinc-400" />
                    <span className="text-[10px] font-bold text-zinc-300 uppercase">
                      Hidden ({hiddenWidgetsCount})
                    </span>
                    <ChevronDown className="h-3 w-3 text-zinc-500" />
                  </button>

                  <div className="animate-in fade-in slide-in-from-top-2 absolute top-full right-0 z-20 mt-2 hidden w-48 translate-y-2 overflow-hidden rounded-lg border border-white/10 bg-zinc-900 shadow-xl group-hover:block">
                    <div className="space-y-1 p-2">
                      {hiddenWidgets.map((id) => {
                        const widget = widgets.find((w) => w.id === id);
                        return (
                          <button
                            key={id}
                            onClick={() => onRestoreWidget(id)}
                            className="group/item flex w-full items-center gap-2 rounded px-2 py-1.5 text-left transition-colors hover:bg-white/5"
                          >
                            <Eye className="h-3 w-3 text-zinc-500 group-hover/item:text-white" />
                            <span className="text-xs text-zinc-300 group-hover/item:text-white">
                              {widget?.title || id}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <ActiveVehicleSelect
                value={activeRacerId}
                displayLabel={`#${activeRacer?.number ?? '--'} - ${activeRacer?.name ?? 'Unknown'}`}
                options={[...activeRacers]
                  .sort((a, b) => Number(a.number) - Number(b.number))
                  .map((racer) => ({
                    id: racer.id,
                    label: `#${racer.number} - ${racer.name}`,
                  }))}
                onChange={onSetActiveRacer}
              />
            </div>
          }
        />
      </div>
    </div>
  );
};
