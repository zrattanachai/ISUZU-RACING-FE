import React, { useState } from 'react';
import { Eye, Video, Activity } from 'lucide-react';
import { OvenStreamPlayer } from '@/components/features/OvenStreamPlayer';
import { toYouTubeEmbedUrl } from '@/lib/streamUrls';

export type CameraPosition = string;

export interface CameraFeedProps {
  label: string;
  carNumber?: string;
  position: CameraPosition;
  isLive?: boolean;
  dimmed?: boolean;
  streamUrl?: string | null;
  streamMimeType?: string | null;
  resetKey?: string;
  className?: string;
}

const CameraIcons: Record<string, React.ElementType> = {
  FRONT: Eye,
  COCKPIT: Activity,
  REAR: Video,
  OVERHEAD: Eye,
  PIT: Video,
};

export const CameraFeed: React.FC<CameraFeedProps> = ({
  label,
  carNumber,
  position,
  isLive = true,
  dimmed = false,
  streamUrl,
  streamMimeType,
  resetKey,
  className = '',
}) => {
  const Icon = CameraIcons[position] || Eye;
  const [failedVideoState, setFailedVideoState] = useState<{
    resetKey: string | null;
    videoKey: string | null;
  }>({ resetKey: null, videoKey: null });
  const videoKey = streamUrl ? `${position}:${streamUrl}` : null;
  const activeResetKey = resetKey ?? position;
  const failedVideoKey =
    failedVideoState.resetKey === activeResetKey
      ? failedVideoState.videoKey
      : null;
  const isWebSocketStream = Boolean(streamUrl?.match(/^wss?:\/\//i));
  const youtubeEmbedUrl = toYouTubeEmbedUrl(streamUrl ?? null);
  const showVideo =
    Boolean(streamUrl) &&
    !isWebSocketStream &&
    !youtubeEmbedUrl &&
    failedVideoKey !== videoKey;

  return (
    <div
      className={`glass-panel group relative flex flex-col overflow-hidden rounded-xl border border-white/10 ${
        dimmed ? 'opacity-45 grayscale saturate-0' : ''
      } ${className}`}
    >
      {/* Label Badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded border border-white/10 bg-black/60 px-2 py-1 backdrop-blur-sm">
        <Icon className="h-3 w-3 text-zinc-400 transition-colors group-hover:text-white" />
        <span className="text-[9px] font-bold tracking-widest text-white">
          {label}
          {carNumber && ` #${carNumber}`}
        </span>
      </div>

      {/* Video / Thumbnail Area */}
      <div className="relative h-full w-full overflow-hidden">
        {isWebSocketStream && streamUrl ? (
          <OvenStreamPlayer
            key={resetKey ? `${resetKey}:${streamUrl}` : streamUrl}
            streamUrl={streamUrl}
            className="absolute inset-0 h-full w-full"
            title={`${position} camera player`}
          />
        ) : null}
        {youtubeEmbedUrl ? (
          <iframe
            key={`${resetKey ?? position}-${youtubeEmbedUrl}`}
            className="absolute inset-0 h-full w-full"
            src={youtubeEmbedUrl}
            title={`${position} YouTube camera player`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : null}
        {showVideo ? (
          <video
            key={`${resetKey ?? position}-${streamUrl}`}
            className="absolute inset-0 h-full w-full object-cover"
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
        <div
          className={`absolute inset-0 transition-colors ${
            dimmed
              ? 'bg-zinc-950/35 group-hover:bg-zinc-950/25'
              : 'bg-black/10 group-hover:bg-transparent'
          }`}
        ></div>
      </div>

      {/* Live Badge */}
      {isLive && (
        <div className="pointer-events-none absolute top-3 right-3 z-10 flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded border border-white/10 bg-black/60 px-2 py-1 shadow-lg backdrop-blur">
            <div className="bg-danger h-1.5 w-1.5 animate-pulse rounded-full"></div>
            <span className="text-[9px] font-bold tracking-widest text-white">
              LIVE
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
