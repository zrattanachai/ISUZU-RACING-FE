'use client';

import React from 'react';
import Image from 'next/image';
import {
  Thermometer,
  Gauge,
  Activity,
  Zap,
  Wind,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TireHUDProps {
  position: string;
  side: 'left' | 'right';
  speed: number;
  temp?: number;
  pressure?: number;
  brakeTemp?: number;
  tempColor?: string;
  brakeColor?: string;
}

const TireHUD: React.FC<TireHUDProps> = ({
  position,
  side,
  speed,
  temp,
  pressure,
  brakeTemp,
  tempColor = 'bg-orange-500',
  brakeColor = 'bg-yellow-500',
}) => {
  const isRight = side === 'right';
  return (
    <div
      className={cn(
        'pointer-events-none absolute top-1/2 w-[108px] -translate-y-1/2 md:w-[144px]',
        isRight
          ? '-right-[32px] text-left md:-right-[130px]'
          : '-left-[32px] text-right md:-left-[130px]'
      )}
    >
      <div className="mb-1 text-[10px] font-bold tracking-wider text-zinc-400 uppercase italic md:mb-2">
        {position} Tire
      </div>
      <div
        className={cn(
          'mb-1 flex items-center gap-2',
          isRight ? 'flex-row' : 'flex-row-reverse'
        )}
      >
        <span className="text-[8px] font-bold text-zinc-600 uppercase md:text-[10px]">
          km/h
        </span>
        <span className="text-accent md:text-md text-sm font-bold tracking-tighter">
          {Math.round(speed)}
        </span>
      </div>
      <div
        className={cn(
          'mb-1 flex items-center gap-2',
          isRight ? 'flex-row' : 'flex-row-reverse'
        )}
      >
        <div
          className={cn('h-1.5 w-1.5 rounded-sm md:h-2 md:w-2', tempColor)}
        ></div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-light tracking-tighter text-white md:text-2xl">
            {temp !== undefined ? `${Math.round(temp)}°C` : 'N/A'}
          </span>
        </div>
      </div>
      <div
        className={cn(
          'mb-3 flex items-center gap-2 md:mb-4',
          isRight ? 'flex-row' : 'flex-row-reverse'
        )}
      >
        <div className="h-1.5 w-1.5 rounded-sm bg-green-500 md:h-2 md:w-2"></div>
        <div className="flex items-baseline gap-1">
          <span className="text-base font-light tracking-tighter text-white md:text-xl">
            {pressure !== undefined ? `${pressure.toFixed(1)} bar` : 'N/A'}
          </span>
        </div>
      </div>
      <div className="mb-1 border-t border-white/10 pt-2 text-[10px] font-bold tracking-wider text-zinc-400 uppercase italic md:mb-2">
        {position} Brakes
      </div>
      <div
        className={cn(
          'flex items-center gap-2',
          isRight ? 'flex-row' : 'flex-row-reverse'
        )}
      >
        <div
          className={cn('h-1.5 w-1.5 rounded-sm md:h-2 md:w-2', brakeColor)}
        ></div>
        <div className="flex items-baseline gap-1">
          <span className="text-base font-light tracking-tighter text-white md:text-xl">
            {brakeTemp !== undefined ? `${Math.round(brakeTemp)}°C` : 'N/A'}
          </span>
        </div>
      </div>
    </div>
  );
};

interface TelemetryHubPanelProps {
  speed: number;
  rpm: number;
  oilTemp: number;
  fuel: number;
  lambda: number;
  boost: number;
  drs: boolean;
  tires: {
    fl: { speed: number; temp: number; press: number; brake: number };
    fr: { speed: number; temp: number; press: number; brake: number };
    rl: { speed: number; temp: number; press: number; brake: number };
    rr: { speed: number; temp: number; press: number; brake: number };
  };
}

export const TelemetryHubPanel: React.FC<TelemetryHubPanelProps> = ({
  speed,
  rpm,
  oilTemp,
  fuel,
  lambda,
  boost,
  drs,
  tires,
}) => {
  return (
    <div className="glass-panel relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-linear-to-br from-zinc-900 to-black">
      {/* Header */}
      <div className="pointer-events-none absolute top-3 left-3 z-50 flex items-center gap-2">
        <TrendingUp className="h-3 w-3 text-zinc-500" />
        <span className="text-[9px] font-bold tracking-wider text-zinc-500 uppercase italic">
          Vehicle Telemetry
        </span>
      </div>
      {/* Speed & RPM */}
      <div className="pointer-events-none absolute top-6 left-0 z-30 flex w-full flex-col items-center">
        <div className="flex items-baseline gap-1">
          <span className="text-6xl font-black tracking-tighter text-white italic drop-shadow-[0_0_15px_var(--accent-glow)]">
            {Math.round(speed)}
          </span>
          <span className="text-sm font-bold text-zinc-500 uppercase">
            km/h
          </span>
        </div>
        <div className="mt-1 h-1 w-32 overflow-hidden rounded-full bg-zinc-800">
          <div
            className={cn(
              'h-full transition-all duration-75',
              rpm > 7000
                ? 'bg-accent shadow-[0_0_10px_var(--accent-glow)]'
                : 'bg-white'
            )}
            style={{ width: `${(rpm / 9000) * 100}%` }}
          ></div>
        </div>
        <span className="mt-1 font-mono text-xs text-zinc-400">
          {Math.round(rpm)} RPM
        </span>
      </div>

      {/* Right Side Data Column */}
      <div className="pointer-events-none absolute top-1/2 right-6 z-40 flex -translate-y-1/2 flex-col gap-2">
        {[
          { icon: Thermometer, label: 'OIL', value: `${Math.round(oilTemp)}°` },
          { icon: Gauge, label: 'FUEL', value: `${Math.round(fuel)}%` },
          { icon: Activity, label: 'LAMBDA', value: lambda.toFixed(3) },
          { icon: Zap, label: 'BOOST', value: boost.toFixed(1) },
          {
            icon: Wind,
            label: 'DRS',
            value: drs ? 'OPEN' : 'OFF',
            color: drs ? 'text-blue-400' : 'text-zinc-600',
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="flex w-20 flex-col items-center gap-1 rounded-lg border border-white/10 bg-black/60 p-3 backdrop-blur"
          >
            <div className="flex items-center gap-1 text-[8px] font-bold tracking-wider text-zinc-500 uppercase">
              <stat.icon className="h-3 w-3" /> {stat.label}
            </div>
            <div
              className={cn(
                'text-xs leading-none font-bold text-white',
                stat.color
              )}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Center Car View */}
      <div className="relative flex aspect-[1/2.2] h-[90%] w-auto max-w-full translate-y-4 items-center justify-center">
        <Image
          src="/car.png"
          // src="https://lh3.googleusercontent.com/d/1NQBLvLxI9phuUUhDIenQ6VIRr7kJO5na"
          alt="Car Top View"
          fill
          className="z-10 object-contain object-[center_62%] drop-shadow-[0_0_50px_rgba(0,0,0,0.6)]"
        />

        {/* HUDs */}
        <div className="absolute top-[20%] left-0 z-40">
          <TireHUD
            position="FL"
            side="left"
            speed={tires.fl.speed}
            temp={tires.fl.temp}
            pressure={tires.fl.press}
            brakeTemp={tires.fl.brake}
          />
        </div>
        <div className="absolute top-[20%] right-0 z-40">
          <TireHUD
            position="FR"
            side="right"
            speed={tires.fr.speed}
            temp={tires.fr.temp}
            pressure={tires.fr.press}
            brakeTemp={tires.fr.brake}
          />
        </div>
        <div className="absolute bottom-[25%] left-0 z-40">
          <TireHUD
            position="RL"
            side="left"
            speed={tires.rl.speed}
            temp={tires.rl.temp}
            pressure={tires.rl.press}
            brakeTemp={tires.rl.brake}
          />
        </div>
        <div className="absolute right-0 bottom-[25%] z-40">
          <TireHUD
            position="RR"
            side="right"
            speed={tires.rr.speed}
            temp={tires.rr.temp}
            pressure={tires.rr.press}
            brakeTemp={tires.rr.brake}
          />
        </div>
      </div>
    </div>
  );
};
