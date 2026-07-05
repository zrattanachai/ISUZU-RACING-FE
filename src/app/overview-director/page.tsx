'use client';

import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Search,
  AlertTriangle,
  Zap,
  Gauge,
  Activity,
  MoveHorizontal,
  MoveVertical,
  CircleGauge,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AccessDeniedState } from '@/components/common/AccessDeniedState';
import { usePlatform } from '@/context/PlatformContext';
import { PageHeader } from '@/components/layout/PageHeader';
import { useFleetTelemetry } from '@/hooks/useFleetTelemetry';
import { useFleetLocation } from '@/hooks/useFleetLocation';
import { canAccessRoute } from '@/lib/navigationAccess';

export default function OverviewDirectorPage() {
  const { cars, drivers, currentRole } = usePlatform();
  const {
    latestTelemetry: telemetryData,
    latestAnomalies,
    resetAnomalies,
  } = useFleetTelemetry({
    cars,
    maxHistory: 120,
  });
  const { latestLocations } = useFleetLocation({ cars });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{
    key: 'POSITION' | 'VIOLATION' | 'NUMBER';
    order: 'ASC' | 'DESC';
  }>({ key: 'POSITION', order: 'ASC' });

  const handleReset = () => resetAnomalies();

  // --- Merging & Sorting ---
  const displayCars = useMemo(() => {
    const positionByCarId = new Map(
      latestLocations
        .map((location) => ({
          vehicleId: location.vehicleId,
          progress:
            location.progressContinuous ?? location.lap + location.lapProgress,
        }))
        .sort((a, b) => b.progress - a.progress)
        .map((entry, index) => [entry.vehicleId, index + 1] as const)
    );

    const merged = telemetryData.map((car) => {
      const anomaly = latestAnomalies.get(car.id);
      const driver = drivers.find((d) => d.carId === car.id);

      // Violations sourced from backend (alertDelay + warningPenalty logic).
      const violations = {
        boost: anomaly?.metrics.boost?.violations ?? 0,
        speed: anomaly?.metrics.speed?.violations ?? 0,
        rpm: anomaly?.metrics.rpm?.violations ?? 0,
        lambda: anomaly?.metrics.lambda?.violations ?? 0,
        gLat: anomaly?.metrics.gLat?.violations ?? 0,
        gLong: anomaly?.metrics.gLong?.violations ?? 0,
        throttle: anomaly?.metrics.throttle?.violations ?? 0,
        brake: anomaly?.metrics.brake?.violations ?? 0,
      };

      // Anomalies (penalties) sourced from backend.
      const anomalies = {
        boost: anomaly?.metrics.boost?.anomalies ?? 0,
        speed: anomaly?.metrics.speed?.anomalies ?? 0,
        rpm: anomaly?.metrics.rpm?.anomalies ?? 0,
        lambda: anomaly?.metrics.lambda?.anomalies ?? 0,
        gLat: anomaly?.metrics.gLat?.anomalies ?? 0,
        gLong: anomaly?.metrics.gLong?.anomalies ?? 0,
        throttle: anomaly?.metrics.throttle?.anomalies ?? 0,
        brake: anomaly?.metrics.brake?.anomalies ?? 0,
      };

      return {
        ...car,
        driverName: driver ? driver.name : `Driver ${car.id}`,
        violations,
        anomalies,
        // suspicionScore = total violation count across all metrics (backend-computed).
        suspicionScore: anomaly?.totalViolations ?? 0,
        penaltyCount: anomaly?.totalAnomalies ?? 0,
        racePosition: positionByCarId.get(car.id) ?? Number(car.number),
        // A car is flagged as suspicious once it accrues >= 1 anomaly/punishment (backend).
        isSuspicious: (anomaly?.totalAnomalies ?? 0) > 0,
      };
    });

    let filtered = merged;
    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.number.includes(searchTerm) ||
          c.driverName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered.sort((a, b) => {
      if (sortConfig.key === 'POSITION') {
        return sortConfig.order === 'DESC'
          ? (b.racePosition as number) - (a.racePosition as number)
          : (a.racePosition as number) - (b.racePosition as number);
      }
      if (sortConfig.key === 'VIOLATION') {
        return sortConfig.order === 'DESC'
          ? (b.suspicionScore as number) - (a.suspicionScore as number)
          : (a.suspicionScore as number) - (b.suspicionScore as number);
      }
      return sortConfig.order === 'DESC'
        ? parseInt(b.number) - parseInt(a.number)
        : parseInt(a.number) - parseInt(b.number);
    });
  }, [
    telemetryData,
    latestAnomalies,
    drivers,
    latestLocations,
    searchTerm,
    sortConfig,
  ]);

  const totalViolations = displayCars.reduce(
    (acc, c) => acc + (c.suspicionScore as number),
    0
  );
  const totalPenalties = displayCars.reduce(
    (acc, c) => acc + (c.penaltyCount as number),
    0
  );

  if (!canAccessRoute('/overview-director', currentRole)) {
    return (
      <AccessDeniedState message="Your role does not have access to the Overview Director dashboard." />
    );
  }

  return (
    <div className="flex h-screen w-full flex-col gap-4 overflow-hidden p-6 text-white">
      <PageHeader
        title="Investigation Unit"
        subtitle={`${totalPenalties} PENALTY • ${totalViolations} VIOLATION`}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-900/50 p-1">
              <button
                onClick={() =>
                  setSortConfig({
                    key: 'POSITION',
                    order: sortConfig.order === 'DESC' ? 'ASC' : 'DESC',
                  })
                }
                className={`flex items-center gap-2 rounded px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${sortConfig.key === 'POSITION' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
              >
                <span className="text-[10px] font-black italic">P</span> Rank
                {sortConfig.key === 'POSITION' &&
                  (sortConfig.order === 'DESC' ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronUp className="h-3 w-3" />
                  ))}
              </button>
              <button
                onClick={() =>
                  setSortConfig({
                    key: 'VIOLATION',
                    order: sortConfig.order === 'DESC' ? 'ASC' : 'DESC',
                  })
                }
                className={`flex items-center gap-2 rounded px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${sortConfig.key === 'VIOLATION' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
              >
                <AlertTriangle className="h-3 w-3" /> Violation
                {sortConfig.key === 'VIOLATION' &&
                  (sortConfig.order === 'DESC' ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronUp className="h-3 w-3" />
                  ))}
              </button>
              <button
                onClick={() =>
                  setSortConfig({
                    key: 'NUMBER',
                    order: sortConfig.order === 'DESC' ? 'ASC' : 'DESC',
                  })
                }
                className={`flex items-center gap-2 rounded px-3 py-1.5 text-[10px] font-bold uppercase transition-all ${sortConfig.key === 'NUMBER' ? 'bg-zinc-800 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
              >
                <span className="text-[10px] font-black italic">#</span> Car No.
                {sortConfig.key === 'NUMBER' &&
                  (sortConfig.order === 'DESC' ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronUp className="h-3 w-3" />
                  ))}
              </button>
            </div>

            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="focus:border-isuzu-red w-48 rounded-lg border border-white/10 bg-zinc-900/50 py-2 pr-4 pl-10 text-xs text-white transition-all outline-none"
              />
            </div>

            <button
              onClick={handleReset}
              className="rounded-lg border border-white/10 bg-zinc-900/50 p-2 text-zinc-500 transition-all hover:bg-zinc-800 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        }
      />

      {/* Main Grid */}
      <div className="grid flex-1 grid-cols-2 content-start gap-4 overflow-y-auto pr-1 md:grid-cols-3 xl:grid-cols-4">
        {displayCars.map((car) => (
          <div
            key={car.id}
            className={`relative flex h-35 cursor-pointer overflow-hidden rounded-lg border transition-all duration-300 ${car.isSuspicious ? 'border-red-500/40 bg-red-500/5 shadow-[0_0_10px_rgba(239,68,68,0.05)]' : 'border-white/5 bg-zinc-900/30 hover:border-white/20 hover:bg-zinc-900/50'}`}
          >
            <div className="absolute top-2 left-2 z-10 rounded border border-white/10 bg-black/70 px-1.5 py-0.5 font-mono text-[9px] font-black text-white">
              P{car.racePosition as number}
            </div>
            {car.isSuspicious && (
              <div className="absolute top-0 right-0 h-3 w-3 animate-pulse rounded-bl bg-red-500 shadow-[0_0_5px_red]"></div>
            )}

            <div className="flex w-20 shrink-0 flex-col items-center justify-center border-r border-white/5 bg-black/20">
              <span
                className={`text-3xl font-black tracking-tighter italic ${car.isSuspicious ? 'text-red-500' : 'text-zinc-600'}`}
              >
                {car.number}
              </span>
              <span className="mt-1 truncate text-center text-[10px] font-bold text-zinc-500">
                {car.driverName.split(' ').pop()}
              </span>
              <div className="mt-2 grid w-16 grid-cols-2 gap-1 text-center">
                <div className="rounded border border-amber-500/20 bg-amber-500/10 px-1 py-0.5">
                  <div className="text-[7px] font-black text-amber-400 uppercase">
                    Wrn
                  </div>
                  <div className="font-mono text-[10px] font-black text-white">
                    {car.suspicionScore as number}
                  </div>
                </div>
                <div className="rounded border border-red-500/20 bg-red-500/10 px-1 py-0.5">
                  <div className="text-[7px] font-black text-red-400 uppercase">
                    Pen
                  </div>
                  <div className="font-mono text-[10px] font-black text-white">
                    {car.penaltyCount as number}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-[1fr_40px_40px] items-center gap-x-2 gap-y-px p-2">
              <div className="text-right text-[8px] font-bold tracking-wide text-zinc-600">
                VAL
              </div>
              <div className="text-center text-[8px] font-bold tracking-wide text-zinc-600">
                WRN
              </div>
              <div className="text-center text-[8px] font-bold tracking-wide text-zinc-600">
                PEN
              </div>

              <DataRow label="BST" value={car.boost} icon={Gauge} isFloat />
              <CountBadge count={car.violations.boost} tone="warning" />
              <CountBadge count={car.anomalies.boost} tone="penalty" />
              <DataRow label="SPD" value={car.speed} icon={Zap} />
              <CountBadge count={car.violations.speed} tone="warning" />
              <CountBadge count={car.anomalies.speed} tone="penalty" />
              <DataRow label="RPM" value={car.rpm} icon={Gauge} />
              <CountBadge count={car.violations.rpm} tone="warning" />
              <CountBadge count={car.anomalies.rpm} tone="penalty" />
              <DataRow label="LMB" value={car.lambda} icon={Activity} isFloat />
              <CountBadge count={car.violations.lambda} tone="warning" />
              <CountBadge count={car.anomalies.lambda} tone="penalty" />
              <DataRow label="GLT" value={car.gLat} icon={MoveHorizontal} isFloat />
              <CountBadge count={car.violations.gLat} tone="warning" />
              <CountBadge count={car.anomalies.gLat} tone="penalty" />
              <DataRow label="GLG" value={car.gLong} icon={MoveVertical} isFloat />
              <CountBadge count={car.violations.gLong} tone="warning" />
              <CountBadge count={car.anomalies.gLong} tone="penalty" />
              <DataRow label="THR" value={car.throttle} icon={Zap} />
              <CountBadge count={car.violations.throttle} tone="warning" />
              <CountBadge count={car.anomalies.throttle} tone="penalty" />
              <DataRow label="BRK" value={car.brake} icon={CircleGauge} />
              <CountBadge count={car.violations.brake} tone="warning" />
              <CountBadge count={car.anomalies.brake} tone="penalty" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataRow({
  label,
  value,
  icon: Icon,
  isFloat,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  isFloat?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <div className="flex w-10 shrink-0 items-center gap-1.5">
        <Icon className="h-3 w-3 text-zinc-600" />
        <span className="text-[9px] font-bold text-zinc-500">{label}</span>
      </div>
      <div className="flex flex-1 items-baseline justify-end gap-1">
        <span className="font-mono text-xs leading-none font-bold text-white">
          {isFloat ? value.toFixed(1) : Math.round(value)}
        </span>
      </div>
    </div>
  );
}

function CountBadge({
  count,
  tone,
}: {
  count: number;
  tone: 'warning' | 'penalty';
}) {
  const activeClass =
    tone === 'warning' ? 'bg-amber-500 text-black' : 'bg-orange-500 text-black';

  return (
    <div
      className={`flex h-3 items-center justify-center rounded-sm transition-colors ${count > 0 ? activeClass : 'bg-white/5'}`}
    >
      {count > 0 ? (
        <span className="text-[9px] leading-none font-black text-black">
          {count}
        </span>
      ) : (
        <span className="text-[8px] text-zinc-700">-</span>
      )}
    </div>
  );
}
