'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ChevronRight, Eye, EyeOff } from 'lucide-react';
import { useOptionalPlatform } from '@/context/PlatformContext';
import { DEFAULT_BRAND_CONFIG } from '@/lib/constants';

interface LoginPanelProps {
  onLogin: (email: string, password: string) => Promise<boolean>;
}

export function LoginPanel({ onLogin }: LoginPanelProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const context = useOptionalPlatform();
  const platformName =
    context?.platformName ?? DEFAULT_BRAND_CONFIG.platformName;
  const logoUrl = context?.logoUrl ?? DEFAULT_BRAND_CONFIG.logoUrl;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    window.setTimeout(async () => {
      try {
        const didLogin = await onLogin(email.trim(), password);
        if (!didLogin) {
          setError('Invalid credentials');
        }
      } catch {
        setError('Unable to reach authentication service');
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-black">
      <div className="absolute inset-0 z-0">
        <div className="via-accent absolute top-[35%] left-0 h-px w-full bg-linear-to-r from-transparent to-transparent opacity-20"></div>
        <div className="bg-accent absolute top-[40%] left-[-20%] h-75 w-[50%] rounded-full opacity-[0.04] blur-[100px]"></div>
        <div className="absolute right-[-10%] bottom-[20%] h-50 w-[40%] rounded-full bg-white opacity-[0.03] blur-[80px]"></div>
      </div>

      <div className="z-10 w-full max-w-md p-8">
        <div className="group relative mb-12 flex flex-col items-center text-center">
          <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-48 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-[60px]"></div>
          <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-24 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-[30px]"></div>
          <div className="bg-accent/10 pointer-events-none absolute top-1/2 left-1/2 -z-10 h-20 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[20px]"></div>

          <Image
            src={logoUrl}
            alt={`${platformName} Logo`}
            width={280}
            height={112}
            className="mb-6 h-28 w-auto object-contain brightness-110 drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] transition-transform duration-500 group-hover:scale-105"
            priority
            quality={100}
            unoptimized
          />
          <p className="font-mono text-xs tracking-[0.2em] text-zinc-500 uppercase">
            Engineering Division
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <input
              type="email"
              placeholder="Race ID / Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="focus:border-accent/50 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white placeholder-zinc-700 transition-all focus:bg-white/10 focus:outline-none"
              required
            />
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Access Token"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="focus:border-accent/50 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3.5 pr-11 text-sm text-white placeholder-zinc-700 transition-all focus:bg-white/10 focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute top-1/2 right-3 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded text-zinc-600 transition-colors hover:bg-white/5 hover:text-white"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {error ? (
              <p className="text-[10px] font-bold tracking-widest text-red-500 uppercase">
                {error}
              </p>
            ) : null}
          </div>

          <button
            type="submit"
            className="group relative mt-6 flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg bg-white py-3.5 font-medium text-black transition-all hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-80"
            disabled={loading}
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/30 border-t-black"></div>
            ) : (
              <>
                <span>Initialize Dashboard</span>
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 space-y-3 text-center">
          <p className="font-mono text-[10px] font-bold tracking-widest text-zinc-700 uppercase">
            Power by Embedded Linux Group
          </p>
          <p className="font-mono text-[10px] text-zinc-800">
            SECURE CONNECTION REQUIRED • V3.0.0
          </p>
        </div>
      </div>
    </div>
  );
}
