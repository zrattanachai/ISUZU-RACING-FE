'use client';

import React from 'react';
import {
  Eye,
  Users,
  GitCompare,
  Siren,
  AlertOctagon,
  Flag,
  ChevronLeft,
  ChevronRight,
  Map as MapIcon,
} from 'lucide-react';
import { MapWidget } from '@/components/features/MapWidget';
import { getCircuit } from '@/lib/circuits';
import { usePlatform } from '@/context/PlatformContext';
import type { VehicleLocation, Car } from '@/types';
import type { RaceStatus, RightPanelPage } from './types';

interface DirectorRightPanelProps {
  rightPanelPage: RightPanelPage;
  onTogglePage: () => void;
  isCompareMode: boolean;
  onToggleCompare: () => void;
  raceStatus: RaceStatus;
  onSetRaceStatus: (status: RaceStatus) => void;
  fleetLocations: VehicleLocation[];
  selectedPrimaryCarId: number;
  selectedCarIds: number[];
  cars: Car[];
  allowDirectorControls?: boolean;
  mapStats?: {
    lap: number;
    totalLaps: number;
    currentTime: string;
    bestTime: string;
  };
}

export const DirectorRightPanel: React.FC<DirectorRightPanelProps> = ({
  rightPanelPage,
  onTogglePage,
  isCompareMode,
  onToggleCompare,
  raceStatus,
  onSetRaceStatus,
  fleetLocations,
  selectedPrimaryCarId,
  selectedCarIds,
  cars,
  allowDirectorControls = true,
  mapStats,
}) => {
  const { activeCircuitId } = usePlatform();
  const safeCars = Array.isArray(cars) ? cars : [];
  const safeLocations = Array.isArray(fleetLocations) ? fleetLocations : [];
  const showDirectorControls = false;

  return (
    <div className="glass-panel bg-surface/80 relative flex h-75 shrink-0 flex-col rounded-xl border border-white/10 p-4">
      {allowDirectorControls && showDirectorControls && (
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={onTogglePage}
            className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-white"
          >
            {rightPanelPage === 'DIRECTOR' ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      {allowDirectorControls &&
      showDirectorControls &&
      rightPanelPage === 'DIRECTOR' ? (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-zinc-400">
              <Eye className="h-4 w-4" />
              <span className="text-xs font-bold tracking-wider uppercase">
                Race Director
              </span>
            </div>
          </div>

          <button
            onClick={onToggleCompare}
            className={`mb-3 w-full rounded-lg border py-2.5 text-xs font-bold ${
              isCompareMode
                ? 'border-info bg-info/20 text-info'
                : 'border-transparent bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
            }`}
          >
            {isCompareMode ? (
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4" /> EXIT COMPARE MODE
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <GitCompare className="h-4 w-4" /> COMPARE RACERS
              </span>
            )}
          </button>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => onSetRaceStatus('SC')}
              className={`rounded border p-3 text-[10px] font-bold ${
                raceStatus === 'SC'
                  ? 'border-warning bg-warning/20 text-warning'
                  : 'border-white/10 bg-white/5 text-zinc-300'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <Siren className="h-4 w-4" /> SAFETY CAR
              </span>
            </button>
            <button
              onClick={() => onSetRaceStatus('RED')}
              className={`rounded border p-3 text-[10px] font-bold ${
                raceStatus === 'RED'
                  ? 'border-danger bg-danger/20 text-danger'
                  : 'border-white/10 bg-white/5 text-zinc-300'
              }`}
            >
              <span className="inline-flex items-center gap-1">
                <AlertOctagon className="h-4 w-4" /> RED FLAG
              </span>
            </button>
          </div>

          <button
            onClick={() => onSetRaceStatus('YELLOW')}
            className="w-full rounded border border-white/10 bg-zinc-800 py-2 text-[10px] font-bold hover:bg-zinc-700"
          >
            <span className="inline-flex items-center gap-1">
              <Flag className="text-warning h-3 w-3" /> INVESTIGATE INCIDENT
            </span>
          </button>
        </>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="mb-3 flex items-start justify-between gap-3 pr-8 text-zinc-400">
            <div className="flex items-center gap-2">
              <MapIcon className="h-4 w-4" />
              <span className="text-xs font-bold tracking-wider uppercase">
                Track Map
              </span>
            </div>
            {mapStats && (
              <div className="grid grid-cols-3 gap-1 text-right font-mono text-[9px] font-bold uppercase">
                <div className="rounded border border-white/10 bg-black/30 px-1.5 py-1">
                  <div className="text-zinc-500">Lap</div>
                  <div className="text-white">
                    {mapStats.lap}/{mapStats.totalLaps}
                  </div>
                </div>
                <div className="rounded border border-white/10 bg-black/30 px-1.5 py-1">
                  <div className="text-zinc-500">Time</div>
                  <div className="text-white">{mapStats.currentTime}</div>
                </div>
                <div className="rounded border border-white/10 bg-black/30 px-1.5 py-1">
                  <div className="text-zinc-500">Best</div>
                  <div className="text-white">{mapStats.bestTime}</div>
                </div>
              </div>
            )}
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border border-white/5">
            <MapWidget
              circuit={getCircuit(activeCircuitId)}
              hideCircuitNameOnSmallWidget
              mainCarProgress={
                safeLocations.find((l) => l.vehicleId === selectedPrimaryCarId)
                  ?.lapProgress ?? 0
              }
              rivals={safeCars
                .filter((car) => car.id !== selectedPrimaryCarId)
                .map((car) => ({
                  id: car.id,
                  name: car.number,
                  color: selectedCarIds.includes(car.id)
                    ? '#3b82f6'
                    : (car.color ?? '#ffffff'),
                  progress:
                    safeLocations.find((l) => l.vehicleId === car.id)
                      ?.lapProgress ?? 0,
                  isSelected: selectedCarIds.includes(car.id),
                }))}
              activeFlag={
                raceStatus === 'GREEN'
                  ? null
                  : {
                      turn: '3',
                      type: raceStatus === 'SC' ? 'YELLOW' : raceStatus,
                    }
              }
              className="h-full border-none bg-transparent"
            />
          </div>
        </div>
      )}
    </div>
  );
};
