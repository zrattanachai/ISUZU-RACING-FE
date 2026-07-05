'use client';

import React from 'react';
import { Gauge } from 'lucide-react';
import { useOptionalPlatform } from '@/context/PlatformContext';
import { DEFAULT_BRAND_CONFIG } from '@/lib/constants';

interface ControlTelemetryProps {
  steering: number;
  throttle: number;
  brake: number;
  gLat: number;
  gLong: number;
  heading: number;
}

export const ControlTelemetry: React.FC<ControlTelemetryProps> = ({
  steering,
  throttle,
  brake,
  gLat,
  gLong,
  heading,
}) => {
  const context = useOptionalPlatform();
  const platformName =
    context?.platformName ?? DEFAULT_BRAND_CONFIG.platformName;

  const maxG = 2;
  const px = 50 + (Math.max(-maxG, Math.min(maxG, gLat)) / maxG) * 40;
  const py = 50 - (Math.max(-maxG, Math.min(maxG, gLong)) / maxG) * 40;

  return (
    <div className="relative flex h-full w-full justify-around gap-2 rounded-2xl border border-white/10 bg-black/40 p-4 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMCIgaGVpZ2h0PSIxMCI+PHJlY3Qgd2lkdGg9IjEiIGhlaWdodD0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-30"></div>

      {/* Section Name */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <Gauge className="h-3 w-3 text-zinc-500" />
        <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
          Pedal & Steering
        </span>
      </div>

      {/* Brake Pedal */}
      <div className="group relative z-10 flex h-full flex-col items-center justify-end gap-0.5">
        <div className="relative h-16 w-6 skew-x-[-10deg] overflow-hidden rounded-sm border border-zinc-700 bg-zinc-900/80 shadow-[inset_0_0_20px_rgba(0,0,0,1)] lg:h-24">
          <div className="absolute top-0 right-0 z-20 flex h-full w-full flex-col justify-between px-1 py-1 opacity-30">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-px w-2 self-end bg-white"></div>
            ))}
          </div>
          <div
            className="absolute bottom-0 w-full bg-linear-to-t from-red-900 via-red-600 to-red-400 shadow-[0_0_20px_rgba(220,38,38,0.6)] transition-all duration-75 ease-out"
            style={{ height: `${brake}%` }}
          >
            <div className="absolute top-0 h-0.5 w-full bg-white blur-[1px]"></div>
          </div>
          {/* % Value */}
          <div className="absolute bottom-1 left-0 z-30 w-full text-center text-[8px] font-bold text-white drop-shadow-md">
            {Math.round(brake)}%
          </div>
        </div>
        <div className="text-center">
          <div className="skew-x-[-10deg] text-[9px] font-black tracking-widest text-zinc-500 uppercase">
            Brk
          </div>
        </div>
      </div>

      {/* Steering Wheel */}
      <div className="relative z-20 mb-1 flex translate-y-12 flex-col items-center">
        <div
          className="relative mb-1 flex h-16 w-20 items-center justify-center drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)] filter lg:h-16 lg:w-24"
          style={{
            transform: `rotate(${steering}deg)`,
            transition: 'transform 0.05s ease-out',
          }}
        >
          <svg viewBox="0 0 300 200" className="h-full w-full overflow-visible">
            <defs>
              <linearGradient
                id="carbonFiber"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
                spreadMethod="reflect"
              >
                <stop offset="0%" stopColor="#1a1a1a" />
                <stop offset="25%" stopColor="#2a2a2a" />
                <stop offset="50%" stopColor="#111" />
                <stop offset="75%" stopColor="#2a2a2a" />
                <stop offset="100%" stopColor="#1a1a1a" />
              </linearGradient>
              <linearGradient id="alcantara" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2a2a2a" />
                <stop offset="100%" stopColor="#151515" />
              </linearGradient>
            </defs>
            <path
              d="M 70 60 C 50 60 20 80 20 120 C 20 160 50 170 80 160 L 100 130 L 200 130 L 220 160 C 250 170 280 160 280 120 C 280 80 250 60 230 60 L 70 60 Z"
              fill="url(#carbonFiber)"
              stroke="#111"
              strokeWidth="2"
            />
            <path
              d="M 60 60 C 30 60 20 90 20 120 C 20 150 30 170 60 160 C 45 150 45 90 60 60"
              fill="url(#alcantara)"
            />
            <path
              d="M 240 60 C 270 60 280 90 280 120 C 280 150 270 170 240 160 C 255 150 255 90 240 60"
              fill="url(#alcantara)"
            />
            <path
              d="M 80 70 L 220 70 L 210 120 L 90 120 Z"
              fill="#111"
              stroke="#333"
              strokeWidth="1"
            />
            <text
              x="150"
              y="145"
              fontSize="10"
              fill="#666"
              textAnchor="middle"
              fontFamily="monospace"
              fontWeight="bold"
              letterSpacing="2"
            >
              {platformName.toUpperCase().split(' ')[0]}
            </text>
          </svg>
        </div>
        <div className="mt-2 flex items-center gap-1 rounded-full border border-white/10 bg-black/80 px-2 py-0.5 shadow-lg backdrop-blur">
          <div className="w-8 text-center font-mono text-[9px] font-bold text-white">
            {Math.round(steering)}°
          </div>
        </div>
      </div>

      {/* Throttle Pedal */}
      <div className="group relative z-10 flex h-full flex-col items-center justify-end gap-0.5">
        <div className="relative h-16 w-6 skew-x-10 overflow-hidden rounded-sm border border-zinc-700 bg-zinc-900/80 shadow-[inset_0_0_20px_rgba(0,0,0,1)] lg:h-24">
          <div className="absolute top-0 left-0 z-20 flex h-full w-full flex-col justify-between px-1 py-1 opacity-30">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-px w-2 bg-white"></div>
            ))}
          </div>
          <div
            className="absolute bottom-0 w-full bg-linear-to-t from-green-900 via-green-500 to-green-400 shadow-[0_0_20px_rgba(34,197,94,0.6)] transition-all duration-75 ease-out"
            style={{ height: `${throttle}%` }}
          >
            <div className="absolute top-0 h-0.5 w-full bg-white blur-[1px]"></div>
          </div>
          {/* % Value */}
          <div className="absolute bottom-1 left-0 z-30 w-full text-center text-[8px] font-bold text-white drop-shadow-md">
            {Math.round(throttle)}%
          </div>
        </div>
        <div className="text-center">
          <div className="skew-x-10 text-[9px] font-black tracking-widest text-zinc-500 uppercase">
            Gas
          </div>
        </div>
      </div>

      {/* Right Column: G-Force Graphic */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 h-24 w-24 -translate-x-1/2 opacity-90">
        {/* Compass Ring Outer */}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-full border border-white/10 transition-transform duration-300 ease-out"
          style={{ transform: `rotate(${-heading}deg)` }}
        >
          <div className="text-accent absolute -top-1 left-1/2 -translate-x-1/2 text-[7px] font-black">
            N
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px] font-bold text-zinc-600">
            S
          </div>
          <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 text-[7px] font-bold text-zinc-600">
            E
          </div>
          <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 text-[7px] font-bold text-zinc-600">
            W
          </div>
          <div className="absolute h-px w-full bg-white/5"></div>
          <div className="absolute h-full w-px bg-white/5"></div>
        </div>

        <div className="relative flex h-[60%] w-[60%] items-center justify-center rounded-full border border-white/10 bg-black/40 shadow-inner backdrop-blur-sm">
          <div
            className="bg-accent absolute h-2 w-2 rounded-full border border-white/20 shadow-[0_0_8px_var(--accent-glow)] transition-all duration-75 ease-linear"
            style={{
              left: `${px}%`,
              top: `${py}%`,
              transform: 'translate(-50%, -50%)',
            }}
          ></div>
        </div>

        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 font-mono text-[9px] whitespace-nowrap text-zinc-500">
          HDG {Math.round(heading)}°
        </div>
      </div>
    </div>
  );
};
