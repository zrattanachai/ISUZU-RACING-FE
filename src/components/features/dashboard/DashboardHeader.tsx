'use client';

import { ActiveVehicleSelect } from '@/components/common/ActiveVehicleSelect';
import { PageHeader } from '@/components/layout/PageHeader';
import type { Car, Driver } from '@/types';

interface DashboardHeaderProps {
  activeCarId: number;
  activeCar?: Car;
  activeDriver?: Driver;
  cars: Car[];
  driverNamesByCarId: Map<number, string>;
  onActiveCarChange: (carId: number) => void;
}

export function DashboardHeader({
  activeCarId,
  activeCar,
  activeDriver,
  cars,
  driverNamesByCarId,
  onActiveCarChange,
}: DashboardHeaderProps) {
  return (
    <PageHeader
      title="Race Control"
      subtitle="Live Telemetry Feed • Session Active"
      actions={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="border-success/20 bg-success/10 text-success flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs shadow-[0_0_10px_rgba(34,197,94,0.1)]">
            <span className="bg-success h-1.5 w-1.5 animate-pulse rounded-full"></span>
            System Online
          </div>
          <ActiveVehicleSelect
            value={activeCarId}
            displayLabel={`#${activeCar?.number ?? '--'} - ${activeDriver?.name ?? 'Unassigned'}`}
            options={[...cars]
              .sort((a, b) => Number(a.number) - Number(b.number))
              .map((car) => ({
                id: car.id,
                label: `#${car.number} - ${driverNamesByCarId.get(car.id) ?? 'Driver'}`,
              }))}
            onChange={onActiveCarChange}
          />
        </div>
      }
    />
  );
}
