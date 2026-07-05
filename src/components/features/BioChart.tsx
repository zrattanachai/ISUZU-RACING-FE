'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  YAxis,
  XAxis,
  Tooltip,
  ScatterChart,
  Scatter,
  CartesianGrid,
} from 'recharts';
import { LucideIcon } from 'lucide-react';

interface BioChartProps {
  title: string;
  data: Array<Record<string, number | string | undefined>>;
  dataKey: string;
  min: number;
  max: number;
  color: string;
  stroke: string;
  current: string | number;
  unit: string;
  icon?: LucideIcon;
  graphType?: 'line' | 'scatter';
  isMaximized?: boolean;
}

export const BioChart: React.FC<BioChartProps> = ({
  title,
  data,
  dataKey,
  min,
  max,
  color,
  stroke,
  current,
  unit,
  icon: Icon,
  graphType = 'line',
  isMaximized = false,
}) => {
  return (
    <div className="glass-panel group flex h-full min-h-[160px] w-full flex-col rounded-xl border border-white/5 bg-[#080808] p-4">
      <div className="relative z-10 mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="rounded-lg bg-white/5 p-1.5">
              <Icon className={`h-4 w-4 animate-pulse ${color}`} />
            </div>
          )}
          <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
            {title}
          </span>
        </div>
        <div className="text-right">
          <div className="text-xl leading-none font-light text-white">
            {current}
          </div>
          <div className="font-mono text-[9px] text-zinc-500">{unit}</div>
        </div>
      </div>

      <div className="mt-2 min-h-[140px] w-full min-w-0 flex-1 px-6">
        <ResponsiveContainer width="100%" height="100%">
          {graphType === 'scatter' ? (
            <ScatterChart margin={{ left: -10, right: 0, top: 5, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#222"
                vertical={true}
                horizontal={true}
              />
              <YAxis
                type="number"
                dataKey={dataKey}
                domain={[min, max]}
                stroke="#444"
                fontSize={9}
                width={24}
                tick={{ fill: '#666' }}
              />
              <XAxis
                type="category"
                dataKey="timestamp"
                stroke="#444"
                fontSize={9}
                tick={{ fill: '#666' }}
                minTickGap={30}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{
                  backgroundColor: '#000',
                  borderColor: '#333',
                  fontSize: '12px',
                }}
                itemStyle={{ color: stroke }}
              />
              <Scatter name={title} data={data} fill={stroke} shape="circle" />
            </ScatterChart>
          ) : (
            <LineChart
              data={data}
              margin={{ left: 0, right: 0, top: 5, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#222"
                vertical={true}
                horizontal={true}
              />

              <XAxis
                dataKey="timestamp"
                stroke="#444"
                fontSize={9}
                tick={{ fill: '#666' }}
                minTickGap={isMaximized ? 20 : 30}
                interval="preserveStartEnd"
              />

              <YAxis
                domain={[min, max]}
                stroke="#444"
                fontSize={9}
                width={35}
                tick={{ fill: '#666' }}
                tickCount={isMaximized ? 8 : 4}
              />

              <Tooltip
                contentStyle={{
                  backgroundColor: '#000',
                  borderColor: '#333',
                  fontSize: '12px',
                }}
                itemStyle={{ color: stroke }}
                labelStyle={{ color: '#888', marginBottom: '4px' }}
              />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={stroke}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
