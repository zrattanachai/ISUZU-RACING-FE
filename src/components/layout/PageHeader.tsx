'use client';

import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tighter text-white uppercase">
          {title}
        </h1>
        {subtitle && (
          <div className="mt-1 flex items-center gap-3 font-mono text-[10px] tracking-widest text-zinc-500 uppercase">
            {subtitle}
          </div>
        )}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}
