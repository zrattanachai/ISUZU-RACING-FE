'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { OvenStreamPlayer } from '@/components/features/OvenStreamPlayer';
import { toYouTubeEmbedUrl } from '@/lib/streamUrls';

export type CameraView = 'FRONT' | 'COCKPIT' | 'REAR';

export interface CameraWidgetProps {
  activeCamera: CameraView;
  onCameraChange: (camera: CameraView) => void;
  streamUrl: string | null;
  streamMimeType?: string | null;
  isLive: boolean;
  resetKey?: string;
}

export const CameraWidget: React.FC<CameraWidgetProps> = ({
  activeCamera,
  onCameraChange,
  streamUrl,
  streamMimeType,
  resetKey,
}) => {
  const [failedVideoState, setFailedVideoState] = useState<{
    resetKey: string | null;
    videoKey: string | null;
  }>({ resetKey: null, videoKey: null });
  const videoKey = streamUrl ? `${activeCamera}:${streamUrl}` : null;
  const activeResetKey = resetKey ?? activeCamera;
  const failedVideoKey =
    failedVideoState.resetKey === activeResetKey
      ? failedVideoState.videoKey
      : null;
  const isWebSocketStream = Boolean(streamUrl?.match(/^wss?:\/\//i));
  const youtubeEmbedUrl = toYouTubeEmbedUrl(streamUrl);
  const showVideo =
    Boolean(streamUrl) &&
    !isWebSocketStream &&
    !youtubeEmbedUrl &&
    failedVideoKey !== videoKey;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-black shadow-lg">
      {/* Camera selector */}
      <div className="absolute top-2 left-2 z-20 flex items-center gap-1 rounded border border-white/10 bg-black/60 p-1 backdrop-blur">
        {(['COCKPIT'] as const).map((camera) => (
          <button
            key={camera}
            onClick={() => onCameraChange(camera)}
            className={cn(
              'rounded px-2 py-1 text-[9px] font-bold tracking-wider transition-colors',
              activeCamera === camera
                ? 'bg-accent text-white'
                : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            )}
          >
            {camera}
          </button>
        ))}
      </div>

      {/* Stream */}
      <div className="absolute inset-0">
        {isWebSocketStream && streamUrl ? (
          <OvenStreamPlayer
            key={`${activeResetKey}:${streamUrl}`}
            streamUrl={streamUrl}
            className="absolute inset-0 h-full w-full"
            title={`${activeCamera} camera player`}
          />
        ) : null}
        {youtubeEmbedUrl ? (
          <iframe
            key={`${activeResetKey}-${youtubeEmbedUrl}`}
            className="absolute inset-0 h-full w-full"
            src={youtubeEmbedUrl}
            title={`${activeCamera} YouTube camera player`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : null}
        {showVideo ? (
          <video
            key={`${activeResetKey}-${streamUrl}`}
            className="absolute inset-0 h-full w-full object-cover opacity-75"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            onError={() =>
              setFailedVideoState({ resetKey: activeResetKey, videoKey })
            }
          >
            <source
              src={streamUrl ?? undefined}
              type={streamMimeType ?? 'video/mp4'}
            />
          </video>
        ) : null}
        {!showVideo && !(isWebSocketStream && streamUrl) && !youtubeEmbedUrl ? (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80">
            <span className="text-[10px] font-medium text-zinc-600">
              No Feed
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
};
