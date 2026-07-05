'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Flag, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CircuitConfig } from '@/lib/circuits';
import { DEFAULT_CIRCUIT } from '@/lib/circuits';

interface MapWidgetProps {
  className?: string;
  /** Circuit configuration to render. Falls back to the default circuit when omitted. */
  circuit?: CircuitConfig;
  /** Display name override. Uses circuit.name when omitted. */
  circuitName?: string;
  /** Hide circuit name badge when widget dimensions are too small. */
  hideCircuitNameOnSmallWidget?: boolean;
  /** Minimum width threshold for showing the circuit name badge. */
  minCircuitNameWidth?: number;
  /** Minimum height threshold for showing the circuit name badge. */
  minCircuitNameHeight?: number;
  activeFlag?: { turn: string; type: 'YELLOW' | 'RED' | 'GREEN' } | null;
  mainCarProgress?: number; // 0 to 1
  rivals?: {
    id: number | string;
    name: string;
    color: string;
    progress: number;
    isSelected?: boolean;
  }[];
}

/** Stable empty array used as the default `rivals` prop to avoid re-render loops. */
const EMPTY_RIVALS: NonNullable<MapWidgetProps['rivals']> = [];

export const MapWidget: React.FC<MapWidgetProps> = ({
  className = '',
  circuit,
  circuitName,
  hideCircuitNameOnSmallWidget = false,
  minCircuitNameWidth = 440,
  minCircuitNameHeight = 250,
  activeFlag,
  mainCarProgress = 0,
  rivals = EMPTY_RIVALS,
}) => {
  const activeCircuit = circuit ?? DEFAULT_CIRCUIT;
  const displayName = circuitName ?? activeCircuit.name;
  const [showDriverNames, setShowDriverNames] = useState(false);
  const [showCircuitName, setShowCircuitName] = useState(true);
  const showCircuitBadge = false;
  const rootRef = useRef<HTMLDivElement>(null);

  const trackPathRef = useRef<SVGPathElement>(null);
  const [carMapPos, setCarMapPos] = useState({ x: 100, y: 300 });
  const [rivalPositions, setRivalPositions] = useState<
    {
      id: number | string;
      x: number;
      y: number;
      color: string;
      name: string;
      isSelected?: boolean;
    }[]
  >([]);

  // Calculate positions based on progress
  useEffect(() => {
    if (trackPathRef.current) {
      const path = trackPathRef.current;
      const totalLength = path.getTotalLength();

      // Main Car
      const clampedProgress = Math.max(0, Math.min(1, mainCarProgress));
      const point = path.getPointAtLength(clampedProgress * totalLength);
      setCarMapPos({ x: point.x, y: point.y });

      // Rivals
      const newRivalPositions = rivals.map((rival) => {
        const rivalProg = Math.max(0, Math.min(1, rival.progress));
        const rivalPoint = path.getPointAtLength(rivalProg * totalLength);
        return {
          id: rival.id,
          x: rivalPoint.x,
          y: rivalPoint.y,
          color: rival.color,
          name: rival.name,
          isSelected: rival.isSelected,
        };
      });
      setRivalPositions(newRivalPositions);
    }
  }, [mainCarProgress, rivals, activeCircuit]);

  useEffect(() => {
    if (!hideCircuitNameOnSmallWidget) {
      return;
    }

    const element = rootRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }

    const updateVisibility = (width: number, height: number) => {
      setShowCircuitName(
        width >= minCircuitNameWidth && height >= minCircuitNameHeight
      );
    };

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      updateVisibility(entry.contentRect.width, entry.contentRect.height);
    });

    observer.observe(element);
    updateVisibility(element.clientWidth, element.clientHeight);

    return () => observer.disconnect();
  }, [hideCircuitNameOnSmallWidget, minCircuitNameHeight, minCircuitNameWidth]);

  const activeFlagTurn = activeFlag
    ? activeCircuit.turns.find((t) => t.id === activeFlag.turn)
    : null;

  // Derive which sector the flagged turn falls in using proportional turn index.
  const activeFlagSector = (() => {
    if (!activeFlag || !activeCircuit.sectors) return null;
    const turnIndex = activeCircuit.turns.findIndex(
      (t) => t.id === activeFlag.turn
    );
    if (turnIndex < 0) return null;
    const turnProgress = (turnIndex + 0.5) / activeCircuit.turns.length;
    return (
      activeCircuit.sectors.find(
        (s) => turnProgress >= s.startProgress && turnProgress < s.endProgress
      ) ?? null
    );
  })();

  const FLAG_STYLE: Record<
    'YELLOW' | 'RED' | 'GREEN',
    { label: string; textColor: string; borderColor: string; svgFill: string }
  > = {
    YELLOW: {
      label: 'Yellow Flag',
      textColor: 'text-yellow-500',
      borderColor: 'border-yellow-500/50',
      svgFill: '#EAB308',
    },
    RED: {
      label: 'Red Flag',
      textColor: 'text-red-500',
      borderColor: 'border-red-500/50',
      svgFill: '#EF4444',
    },
    GREEN: {
      label: 'Green Flag',
      textColor: 'text-green-500',
      borderColor: 'border-green-500/50',
      svgFill: '#22c55e',
    },
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        'glass-panel relative flex h-full flex-col overflow-hidden rounded-xl bg-[#080808] p-0',
        className
      )}
    >
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setShowDriverNames((v) => !v)}
          title={showDriverNames ? 'Hide driver names' : 'Show driver names'}
          className={cn(
            'flex items-center gap-1.5 rounded border px-2 py-1 backdrop-blur transition-colors',
            showDriverNames
              ? 'border-white/10 bg-black/80 text-zinc-300 hover:text-white'
              : 'border-white/20 bg-white/10 text-white'
          )}
        >
          {showDriverNames ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
          <span className="text-[10px] font-bold tracking-wider uppercase">
            Driver Names
          </span>
        </button>
      </div>

      {/* Circuit Name */}
      {showCircuitBadge &&
        (!hideCircuitNameOnSmallWidget || showCircuitName) && (
          <div className="absolute top-4 right-4 z-20 rounded border border-white/10 bg-black/80 px-2 py-1 backdrop-blur">
            <span className="text-[10px] font-bold tracking-wide text-white uppercase">
              {displayName}
            </span>
          </div>
        )}

      {/* Active Flag Alert Banner */}
      {activeFlag &&
        (() => {
          const flagStyle = FLAG_STYLE[activeFlag.type];
          const sectorLabel = activeFlagSector
            ? activeFlagSector.id
            : `T${activeFlag.turn}`;
          return (
            <div
              className={`absolute right-4 bottom-4 z-20 flex animate-pulse cursor-pointer items-center gap-2 rounded border ${flagStyle.borderColor} bg-black/80 px-3 py-1.5 transition-all hover:bg-black/90`}
              title="Active Flag"
            >
              <Flag
                className={`h-4 w-4 ${flagStyle.textColor}`}
                fill="currentColor"
              />
              <div className="flex flex-col">
                <span
                  className={`text-[9px] leading-none font-bold uppercase ${flagStyle.textColor}`}
                >
                  {sectorLabel}
                </span>
                <span className="mt-0.5 text-[9px] leading-none font-bold text-white uppercase">
                  {flagStyle.label} T{activeFlag.turn}
                </span>
              </div>
            </div>
          );
        })()}

      <div className="relative flex w-full flex-1 items-center justify-center overflow-hidden bg-transparent">
        {/* Background Texture/Grid */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        ></div>

        <svg
          viewBox={activeCircuit.viewBox}
          className="h-full w-full scale-110 p-4 select-none"
        >
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient
              id="trackGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#94a3b8" />
            </linearGradient>
          </defs>

          {/* Track Path - Border */}
          <path
            d={activeCircuit.pathData}
            className="fill-none stroke-black/80 stroke-[16px]"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Track Path - Main Surface */}
          <path
            ref={trackPathRef}
            d={activeCircuit.pathData}
            className="fill-none stroke-slate-300 stroke-[6px]"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />

          {/* Track Centerline */}
          <path
            d={activeCircuit.pathData}
            className="fill-none stroke-white stroke-[1px] opacity-50"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="10 10"
          />

          {/* Turn Numbers */}
          {activeCircuit.turns.map((turn) => (
            <g key={turn.id}>
              <circle
                cx={turn.x}
                cy={turn.y}
                r="8"
                className="fill-black stroke-white stroke-1"
              />
              <text
                x={turn.x}
                y={turn.y}
                dy="3"
                textAnchor="middle"
                className="fill-white font-mono text-[9px] font-bold select-none"
              >
                {turn.id}
              </text>
            </g>
          ))}

          {/* Flag Marker on track */}
          {activeFlagTurn &&
            activeFlag &&
            (() => {
              const fillColor = FLAG_STYLE[activeFlag.type].svgFill;
              return (
                <g
                  transform={`translate(${activeFlagTurn.x}, ${activeFlagTurn.y - 25})`}
                >
                  <path d="M0 0 L-8 -10 L8 -10 Z" fill={fillColor} />
                  <rect
                    x="-16"
                    y="-30"
                    width="32"
                    height="20"
                    rx="4"
                    fill={fillColor}
                  />
                  <Flag
                    x="-10"
                    y="-26"
                    width="20"
                    height="12"
                    className="text-black"
                    fill="black"
                  />
                </g>
              );
            })()}

          {/* Rivals Markers */}
          {rivalPositions.map((pos, index) => {
            const labelWidth = Math.max(28, Math.min(56, pos.name.length * 7));
            const labelOffsetY = -8 - (index % 4) * 14;

            return (
              <g key={pos.id} transform={`translate(${pos.x}, ${pos.y})`}>
                {/* Arrow for selected rivals */}
                {pos.isSelected && (
                  <path
                    d="M -8 -25 L 8 -25 L 0 -8 Z"
                    fill={pos.color}
                    className="animate-bounce"
                  />
                )}

                {/* Label Box */}
                {showDriverNames && (
                  <g transform={`translate(8, ${labelOffsetY})`}>
                    <rect
                      x="0"
                      y="0"
                      width={labelWidth}
                      height="12"
                      rx="2"
                      fill="black"
                      stroke={pos.color}
                      strokeWidth="1"
                    />
                    <text
                      x={labelWidth / 2}
                      y="9"
                      textAnchor="middle"
                      className="fill-white font-mono text-[8px] font-bold select-none"
                    >
                      {pos.name}
                    </text>
                  </g>
                )}
                {/* Car Dot */}
                <circle
                  r={pos.isSelected ? '6' : '4'}
                  fill={pos.color}
                  className="stroke-white stroke-1 shadow-lg"
                />
              </g>
            );
          })}

          {/* Active Car Marker */}
          <g
            style={{
              transform: `translate(${carMapPos.x}px, ${carMapPos.y}px)`,
            }}
            className="transition-transform duration-75 ease-linear"
          >
            {/* Arrow pointing down */}
            <path
              d="M -12 -35 L 12 -35 L 0 -12 Z"
              fill="var(--accent)"
              className="animate-bounce"
            />

            {/* Car Dot - Bigger */}
            <circle r="10" className="stroke-accent fill-white stroke-[4px]" />
          </g>
        </svg>
      </div>
    </div>
  );
};
