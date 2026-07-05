'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import OvenPlayer from 'ovenplayer';

type OvenSourceType = 'webrtc' | 'hls';

interface OvenStreamPlayerProps {
  streamUrl: string;
  className?: string;
  title?: string;
  onError?: (message: string) => void;
}

interface OvenPlayerInstance {
  on?: (event: string, handler: (payload?: unknown) => void) => void;
  remove?: () => void;
}

interface OvenPlayerFactory {
  create: (
    element: HTMLElement,
    options: {
      autoStart?: boolean;
      autoFallback?: boolean;
      mute?: boolean;
      volume?: number;
      autoMuteRetryOnNotAllowed?: boolean;
      sources: Array<{
        type: OvenSourceType;
        file: string;
        label?: string;
      }>;
    }
  ) => OvenPlayerInstance;
}

function resolveSourceType(streamUrl: string): OvenSourceType {
  if (/^wss?:\/\//i.test(streamUrl)) {
    return 'webrtc';
  }

  return 'hls';
}

export function OvenStreamPlayer({
  streamUrl,
  className,
  title = 'Live stream',
  onError,
}: OvenStreamPlayerProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<OvenPlayerInstance | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sourceType = useMemo(() => resolveSourceType(streamUrl), [streamUrl]);

  useEffect(() => {
    let disposed = false;
    const hostElement = hostRef.current;

    async function mountPlayer() {
      setError(null);

      try {
        if (disposed || !hostElement) {
          return;
        }

        hostElement.innerHTML = '';

        const instance = (OvenPlayer as unknown as OvenPlayerFactory).create(
          hostElement,
          {
            autoStart: true,
            autoFallback: true,
            mute: true,
            volume: 0,
            autoMuteRetryOnNotAllowed: true,
            sources: [
              {
                type: sourceType,
                file: streamUrl,
                label: 'Live',
              },
            ],
          }
        );

        instance.on?.('ready', () => {
          if (!disposed) {
            setError(null);
          }
        });

        instance.on?.('error', (payload) => {
          if (disposed) return;

          const message =
            typeof payload === 'object' &&
            payload !== null &&
            'message' in payload &&
            typeof (payload as { message?: unknown }).message === 'string'
              ? (payload as { message: string }).message
              : 'Unable to play stream.';

          setError(message);
          onError?.(message);
        });

        playerRef.current = instance;
      } catch (err) {
        if (!disposed) {
          const message =
            err instanceof Error ? err.message : 'Unable to initialize player.';
          setError(message);
          onError?.(message);
        }
      }
    }

    void mountPlayer();

    return () => {
      disposed = true;
      playerRef.current?.remove?.();
      playerRef.current = null;
      if (hostElement) {
        hostElement.innerHTML = '';
      }
    };
  }, [onError, sourceType, streamUrl]);

  return (
    <div className={className} title={title}>
      <div ref={hostRef} className="h-full w-full" />
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 px-4 text-center">
          <p className="text-[10px] text-zinc-400">{error}</p>
        </div>
      ) : null}
    </div>
  );
}
