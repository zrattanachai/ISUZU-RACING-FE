'use client';

import type { Ref } from 'react';

import { Check, Database, LayoutGrid } from 'lucide-react';
import { ResponsiveGridLayout } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';

import { SensorCard } from '@/components/features/SensorCard';
import type { SensorCategoryKey, SensorDefinition } from '@/types/dashboard';

interface SensorTelemetryPanelProps {
  activeTab: SensorCategoryKey;
  availableTabs: readonly SensorCategoryKey[];
  canEditLayout: boolean;
  isEditMode: boolean;
  layout: Layout;
  sensorGridRef: Ref<HTMLDivElement>;
  sensorGridWidth: number;
  sensors: SensorDefinition[];
  onLayoutChange: (layout: Layout) => void;
  onTabChange: (tab: SensorCategoryKey) => void;
  onToggleEditMode: () => void;
}

export function SensorTelemetryPanel({
  activeTab,
  availableTabs,
  canEditLayout,
  isEditMode,
  layout,
  sensorGridRef,
  sensorGridWidth,
  sensors,
  onLayoutChange,
  onTabChange,
  onToggleEditMode,
}: SensorTelemetryPanelProps) {
  return (
    <div className="glass-panel group relative flex flex-col overflow-hidden rounded-xl border border-white/5 bg-transparent">
      <div className="flex shrink-0 flex-col border-b border-white/10 lg:flex-row lg:items-center lg:justify-between lg:pr-4">
        <div className="flex overflow-x-auto">
          <div className="flex items-center gap-2 border-r border-white/10 bg-white/5 px-6 py-4">
            <Database className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-bold tracking-tight text-zinc-200 uppercase">
              Telemetry
            </span>
          </div>
          {availableTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`relative px-6 py-4 text-xs font-black tracking-widest transition-colors hover:bg-white/5 ${
                activeTab === tab ? 'bg-white/5 text-white' : 'text-zinc-500'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="bg-accent absolute bottom-0 left-0 h-0.5 w-full shadow-[0_0_8px_var(--accent-glow)]"></div>
              )}
            </button>
          ))}
        </div>

        {canEditLayout ? (
          <div className="px-4 py-3 lg:px-0 lg:py-0">
            <button
              onClick={onToggleEditMode}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black tracking-tighter transition-all ${
                isEditMode
                  ? 'border-accent bg-accent text-white shadow-[0_0_15px_var(--accent-glow)]'
                  : 'border-white/5 bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              {isEditMode ? (
                <Check className="h-3 w-3" />
              ) : (
                <LayoutGrid className="h-3 w-3" />
              )}
              {isEditMode ? 'DONE' : 'EDIT'}
            </button>
          </div>
        ) : null}
      </div>

      <div
        ref={sensorGridRef}
        className={`relative flex-1 overflow-y-auto p-6 transition-colors ${
          isEditMode
            ? 'bg-white/3 bg-[radial-gradient(var(--secondary)_1px,transparent_1px)] bg-size-[20px_20px]'
            : ''
        }`}
      >
        <ResponsiveGridLayout
          className="layout"
          layouts={{ lg: layout }}
          breakpoints={{ lg: 1200, md: 800, sm: 500, xs: 300, xxs: 0 }}
          cols={{ lg: 12, md: 12, sm: 12, xs: 8, xxs: 4 }}
          rowHeight={20}
          width={sensorGridWidth}
          dragConfig={{ enabled: isEditMode }}
          resizeConfig={{ enabled: isEditMode }}
          margin={[16, 16] as const}
          onLayoutChange={(currentLayout) => onLayoutChange(currentLayout)}
        >
          {sensors.map((sensor, index) => (
            <div key={index.toString()}>
              <SensorCard
                name={sensor.name}
                value={sensor.value}
                status={sensor.status}
                channel={sensor.channel}
                isDraggable={isEditMode}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}
