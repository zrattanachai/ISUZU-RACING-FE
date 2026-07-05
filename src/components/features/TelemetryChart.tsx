import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Area,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

export interface TelemetryDataPoint {
  time: string;
  tick: number;
  [key: string]: string | number | undefined;
}

export interface MetricDefinition {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  color: string;
  threshold: number;
}

export interface TelemetryChartProps {
  className?: string;
  data: TelemetryDataPoint[];
  metric: MetricDefinition;
  selectedCarIds: number[];
  compareMode?: boolean;
  compareColors?: string[];
  xAxisMode?: 'time' | 'distance';
  xAxisDistanceCarId?: number;
  xAxisDistanceDomain?: [number, number];
}

const DEFAULT_COMPARE_COLORS = [
  '#06b6d4',
  '#d946ef',
  '#facc15',
  '#f97316',
  '#4ade80',
  '#e879f9',
];

function formatTooltipTimestamp(point?: TelemetryDataPoint): string {
  const sourceTs = point?.sourceTs;
  if (typeof sourceTs === 'number' && Number.isFinite(sourceTs)) {
    return new Date(sourceTs).toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  }

  return typeof point?.time === 'string' ? point.time : '--:--:--.---';
}

function formatAxisTimestamp(value: number): string {
  const date = new Date(value);
  const base = date.toLocaleTimeString([], {
    hour12: false,
    minute: '2-digit',
    second: '2-digit',
  });

  if (date.getMilliseconds() === 0) return base;

  return `${base}.${String(date.getMilliseconds()).padStart(3, '0').slice(0, 1)}`;
}

interface ChartClickState {
  activeTooltipIndex?: number;
}

function buildHalfSecondTicks(
  data: TelemetryDataPoint[]
): number[] | undefined {
  const values = data
    .map((point) => point.__x)
    .filter((value): value is number => typeof value === 'number');

  if (values.length < 2) return undefined;

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max - min > 10_000) return undefined;

  const firstTick = Math.ceil(min / 500) * 500;
  const ticks: number[] = [];
  for (let tick = firstTick; tick <= max; tick += 500) {
    ticks.push(tick);
  }

  return ticks.length > 1 ? ticks : undefined;
}

function formatAxisDistance(value: number): string {
  return `${Math.round(value)}m`;
}

function formatFallbackAxisValue(value: string | number): string {
  return String(value);
}

function getXAxisTickFormatter(
  xAxisMode: 'time' | 'distance',
  hasSourceTimestamps: boolean
) {
  return (value: string | number) =>
    xAxisMode === 'distance' && typeof value === 'number'
      ? formatAxisDistance(value)
      : hasSourceTimestamps && typeof value === 'number'
        ? formatAxisTimestamp(value)
        : formatFallbackAxisValue(value);
}

function getNumericXAxisType(
  xAxisMode: 'time' | 'distance',
  hasSourceTimestamps: boolean
): 'number' | 'category' {
  return xAxisMode === 'distance' || hasSourceTimestamps
    ? 'number'
    : 'category';
}

function getXAxisDomain(
  xAxisMode: 'time' | 'distance',
  hasSourceTimestamps: boolean,
  xAxisDistanceDomain?: [number, number]
) {
  return xAxisMode === 'distance'
    ? (xAxisDistanceDomain ?? ['dataMin', 'dataMax'])
    : hasSourceTimestamps
      ? ['dataMin', 'dataMax']
      : undefined;
}

function getZoomWindowSize(currentSize: number): number {
  return Math.max(10, Math.round(currentSize * 0.35));
}

function getResetZoomThreshold(dataLength: number): number {
  return Math.max(8, Math.round(dataLength * 0.15));
}

function clampZoomStart(
  centerIndex: number,
  windowSize: number,
  maxIndex: number
) {
  return Math.max(
    0,
    Math.min(centerIndex - Math.floor(windowSize / 2), maxIndex)
  );
}

function clampZoomEnd(
  startIndex: number,
  windowSize: number,
  maxIndex: number
) {
  return Math.min(maxIndex, startIndex + windowSize - 1);
}

function getClickedZoomRange(
  clickedIndex: number,
  currentStartIndex: number,
  currentEndIndex: number,
  dataLength: number
) {
  const maxIndex = Math.max(dataLength - 1, 0);
  const currentSize = currentEndIndex - currentStartIndex + 1;

  if (currentSize <= getResetZoomThreshold(dataLength)) {
    return { startIndex: 0, endIndex: maxIndex };
  }

  const windowSize = getZoomWindowSize(currentSize);
  const startIndex = clampZoomStart(clickedIndex, windowSize, maxIndex);
  return {
    startIndex,
    endIndex: clampZoomEnd(startIndex, windowSize, maxIndex),
  };
}

function getAbsoluteTooltipIndex(
  state: ChartClickState | undefined,
  startIndex: number
) {
  return typeof state?.activeTooltipIndex === 'number'
    ? startIndex + state.activeTooltipIndex
    : null;
}

function useHalfSecondTicks(
  visibleData: TelemetryDataPoint[],
  xAxisMode: 'time' | 'distance',
  hasSourceTimestamps: boolean
) {
  return useMemo(
    () =>
      xAxisMode === 'time' && hasSourceTimestamps
        ? buildHalfSecondTicks(visibleData)
        : undefined,
    [hasSourceTimestamps, visibleData, xAxisMode]
  );
}

function useXAxisConfig(
  visibleData: TelemetryDataPoint[],
  xAxisMode: 'time' | 'distance',
  hasSourceTimestamps: boolean,
  xAxisDistanceDomain?: [number, number]
) {
  const halfSecondTicks = useHalfSecondTicks(
    visibleData,
    xAxisMode,
    hasSourceTimestamps
  );

  return {
    ticks: halfSecondTicks,
    type: getNumericXAxisType(xAxisMode, hasSourceTimestamps),
    domain: getXAxisDomain(xAxisMode, hasSourceTimestamps, xAxisDistanceDomain),
    tickFormatter: getXAxisTickFormatter(xAxisMode, hasSourceTimestamps),
  };
}

function useChartClickZoom(
  chartDataLength: number,
  clampedZoomRange: { startIndex: number; endIndex: number },
  setZoomRange: React.Dispatch<
    React.SetStateAction<{ startIndex: number; endIndex: number }>
  >
) {
  return (state: ChartClickState | undefined) => {
    const clickedIndex = getAbsoluteTooltipIndex(
      state,
      clampedZoomRange.startIndex
    );
    if (clickedIndex === null) return;

    setZoomRange(
      getClickedZoomRange(
        clickedIndex,
        clampedZoomRange.startIndex,
        clampedZoomRange.endIndex,
        chartDataLength
      )
    );
  };
}

function useResetZoom(
  chartDataLength: number,
  setZoomRange: React.Dispatch<
    React.SetStateAction<{ startIndex: number; endIndex: number }>
  >
) {
  return () => {
    setZoomRange({
      startIndex: 0,
      endIndex: Math.max(chartDataLength - 1, 0),
    });
  };
}

interface TooltipEntry {
  color?: string;
  dataKey?: string | number;
  name?: string | number;
  value?: string | number;
  payload?: TelemetryDataPoint;
}

function CustomTooltip({
  active,
  payload,
  metric,
  selectedCarIds,
  compareMode,
  compareColors,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  metric: MetricDefinition;
  selectedCarIds: number[];
  compareMode: boolean;
  compareColors: string[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0]?.payload as TelemetryDataPoint | undefined;
  if (!point) return null;

  const visibleEntries = selectedCarIds
    .map((carId, index) => {
      const value = point[`${metric.key}_${carId}`];
      if (typeof value !== 'number') return null;
      const color = compareMode
        ? compareColors[index % compareColors.length]
        : metric.color;
      return {
        key: `tooltip-${metric.key}-${carId}`,
        color,
        label: `Car ${carId}`,
        value,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  if (visibleEntries.length === 0) return null;

  const timestamp = formatTooltipTimestamp(point);

  return (
    <div
      className="rounded border border-white/10 bg-black/95 px-3 py-2 shadow-xl"
      style={{ transform: 'translate(-50%, calc(-100% - 8px))' }}
    >
      <div className="mb-2 font-mono text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
        {timestamp}
      </div>
      <div className="space-y-1">
        {visibleEntries.map((entry) => (
          <div
            key={entry.key}
            className="flex items-center gap-2 font-mono text-xs"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span style={{ color: entry.color }}>{entry.label}</span>
            <span className="text-white">
              {metric.key === 'lambda' ? entry.value.toFixed(2) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  className = '',
  data,
  metric,
  selectedCarIds,
  compareMode = false,
  compareColors = DEFAULT_COMPARE_COLORS,
  xAxisMode = 'time',
  xAxisDistanceCarId,
  xAxisDistanceDomain,
}) => {
  const hasData = data.length > 0;

  const hasSourceTimestamps = data.some(
    (point) =>
      typeof point.sourceTs === 'number' && Number.isFinite(point.sourceTs)
  );

  const chartData = useMemo(() => {
    return data.map((point, index) => {
      let xValue: number | string = index;

      if (xAxisMode === 'distance' && xAxisDistanceCarId) {
        const distance = point[`distance_${xAxisDistanceCarId}`];
        xValue = typeof distance === 'number' ? distance : index;
      } else if (hasSourceTimestamps) {
        xValue =
          typeof point.sourceTs === 'number' && Number.isFinite(point.sourceTs)
            ? point.sourceTs
            : index;
      } else {
        xValue = typeof point.time === 'string' ? point.time : String(index);
      }

      return {
        ...point,
        __x: xValue,
      };
    });
  }, [data, hasSourceTimestamps, xAxisDistanceCarId, xAxisMode]);

  const [zoomRange, setZoomRange] = useState({
    startIndex: 0,
    endIndex: Math.max(chartData.length - 1, 0),
  });
  const [isUserZoomed, setIsUserZoomed] = useState(false);
  const previousMaxIndexRef = useRef(Math.max(chartData.length - 1, 0));

  // Parent data is already windowed (5s/10s/30s/1m/FULL). Unless the user
  // explicitly zooms into a chart, always render the full parent-provided
  // range so x-axis changes immediately when the toolbar window changes.
  useEffect(() => {
    const nextMaxIndex = Math.max(chartData.length - 1, 0);
    const previousMaxIndex = previousMaxIndexRef.current;
    previousMaxIndexRef.current = nextMaxIndex;
    let isCancelled = false;

    queueMicrotask(() => {
      if (isCancelled) return;

      setZoomRange((current) => {
        if (!isUserZoomed) {
          return { startIndex: 0, endIndex: nextMaxIndex };
        }

        const nextStart = Math.min(current.startIndex, nextMaxIndex);
        const nextEnd = Math.min(current.endIndex, nextMaxIndex);

        // Initial render often starts at 0..0 before async data arrives.
        if (
          current.startIndex === 0 &&
          current.endIndex === 0 &&
          nextMaxIndex > 0
        ) {
          return { startIndex: 0, endIndex: nextMaxIndex };
        }

        // If range currently tracks the tail, continue following new points.
        const isFollowingTail = current.endIndex >= previousMaxIndex - 2;
        if (!isFollowingTail) {
          return { startIndex: nextStart, endIndex: nextEnd };
        }

        const windowSize = Math.max(
          1,
          current.endIndex - current.startIndex + 1
        );
        const endIndex = nextMaxIndex;
        const startIndex = Math.max(0, endIndex - windowSize + 1);
        return { startIndex, endIndex };
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [chartData.length, isUserZoomed]);

  const maxIndex = Math.max(chartData.length - 1, 0);
  const clampedZoomRange = useMemo(() => {
    const startIndex = Math.min(Math.max(zoomRange.startIndex, 0), maxIndex);
    const endIndex = Math.min(
      Math.max(zoomRange.endIndex, startIndex),
      maxIndex
    );

    return { startIndex, endIndex };
  }, [maxIndex, zoomRange.endIndex, zoomRange.startIndex]);

  const visibleData = useMemo(() => {
    const { startIndex, endIndex } = clampedZoomRange;
    return chartData.slice(startIndex, endIndex + 1);
  }, [chartData, clampedZoomRange]);

  const xAxisConfig = useXAxisConfig(
    visibleData,
    xAxisMode,
    hasSourceTimestamps,
    xAxisDistanceDomain
  );
  const handleChartClick = useChartClickZoom(
    chartData.length,
    clampedZoomRange,
    setZoomRange
  );
  const resetZoomRange = useResetZoom(chartData.length, setZoomRange);
  const handleResetZoom = () => {
    setIsUserZoomed(false);
    resetZoomRange();
  };

  if (!hasData) {
    return (
      <div
        className={`flex items-center justify-center font-mono text-xs text-zinc-500 ${className}`}
      >
        No data available
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full min-w-0 ${className}`}>
      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
        <ComposedChart
          data={visibleData}
          margin={{ left: 0, right: 30, top: 25, bottom: 8 }}
          onClick={(state) => {
            setIsUserZoomed(true);
            handleChartClick(state as ChartClickState);
          }}
          onDoubleClick={handleResetZoom}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#222"
            vertical={false}
            opacity={0.3}
          />

          {/* Limit Label */}
          <text
            x="100%"
            y={15}
            textAnchor="end"
            fill="#ff3333"
            className="font-mono text-[10px] font-bold tracking-widest uppercase opacity-90"
          >
            LIMIT: {metric.threshold}
          </text>

          {/* Highlights for exceeding values */}
          {selectedCarIds.map((id, index) => {
            const strokeColor = compareMode
              ? compareColors[index % compareColors.length]
              : metric.color;
            const threshold = metric.threshold;
            return (
              <Area
                key={`area_${id}`}
                type="monotone"
                dataKey={(item) => {
                  const val = item[`${metric.key}_${id}`];
                  return typeof val === 'number' && val > threshold
                    ? val
                    : metric.min;
                }}
                baseValue={metric.min}
                stroke="none"
                fill={strokeColor}
                fillOpacity={0.1}
                isAnimationActive={false}
                activeDot={false}
                tooltipType="none"
                legendType="none"
              />
            );
          })}

          <ReferenceLine
            y={metric.threshold}
            stroke="red"
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />

          {selectedCarIds.map((id, index) => {
            const strokeColor = compareMode
              ? compareColors[index % compareColors.length]
              : metric.color;
            return (
              <Line
                key={id}
                type="monotone"
                dataKey={`${metric.key}_${id}`}
                stroke={strokeColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, fill: strokeColor }}
                isAnimationActive={false}
                name={`Car ${id}`}
              />
            );
          })}

          <XAxis
            dataKey="__x"
            type={xAxisConfig.type}
            tick={{ fill: '#6b7280', fontSize: 9, fontFamily: 'monospace' }}
            tickLine={false}
            axisLine={false}
            minTickGap={30}
            interval="preserveEnd"
            height={20}
            domain={xAxisConfig.domain}
            ticks={xAxisConfig.ticks}
            tickFormatter={xAxisConfig.tickFormatter}
          />

          <YAxis
            domain={[metric.min, metric.max]}
            padding={{ top: 0, bottom: 0 }}
            tick={{
              fill: '#6b7280',
              fontSize: 10,
              fontFamily: 'monospace',
              fontWeight: 500,
            }}
            tickLine={false}
            axisLine={false}
            width={35}
            tickCount={4}
            interval="preserveStartEnd"
            tickFormatter={(value) =>
              value.toFixed(metric.key === 'lambda' ? 1 : 0)
            }
          />

          <Tooltip
            content={
              <CustomTooltip
                metric={metric}
                selectedCarIds={selectedCarIds}
                compareMode={compareMode}
                compareColors={compareColors}
              />
            }
            filterNull={true}
            offset={0}
            allowEscapeViewBox={{ x: true, y: true }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
