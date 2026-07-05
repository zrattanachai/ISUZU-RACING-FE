'use client';

import { ShieldAlert } from 'lucide-react';

interface AccessDeniedStateProps {
  title?: string;
  message: string;
}

export function AccessDeniedState({
  title = 'Access Denied',
  message,
}: AccessDeniedStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-20 text-center">
      <div className="mb-4 rounded-full bg-red-500/10 p-4 text-red-500">
        <ShieldAlert className="h-12 w-12" />
      </div>
      <h2 className="text-xl font-black tracking-tight text-white uppercase">
        {title}
      </h2>
      <p className="text-sm text-zinc-500">{message}</p>
    </div>
  );
}
