'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { ActiveVehicleSelect } from '@/components/common/ActiveVehicleSelect';
import { MapWidget } from '@/components/features/MapWidget';
import { getCircuit } from '@/lib/circuits';
import { CameraFeed } from '@/components/features/CameraFeed';
import { OvenStreamPlayer } from '@/components/features/OvenStreamPlayer';
import { PageHeader } from '@/components/layout/PageHeader';
import { usePlatform } from '@/context/PlatformContext';
import { useFleetLocation } from '@/hooks/useFleetLocation';
import { useVehicleStream } from '@/hooks/useVehicleStream';
import {
  toHttpFallbackUrl,
  toPreferredLiveUrl,
  toYouTubeEmbedUrl,
} from '@/lib/streamUrls';

export default function LiveStreamPage() {
  const { cars, drivers, activeCarId, setActiveCarId, activeCircuitId } = usePlatform();

  const selectedCarId = activeCarId;

  const activeCar = useMemo(
    () => cars.find((car) => car.id === selectedCarId),
    [cars, selectedCarId]
  );

  const activeDriver = useMemo(
    () => drivers.find((driver) => driver.carId === selectedCarId),
    [drivers, selectedCarId]
  );

  const driverNamesByCarId = useMemo(
    () =>
      new Map(drivers.map((driver) => [driver.carId, driver.name] as const)),
    [drivers]
  );

  const liveCamera = useVehicleStream(selectedCarId, 'LIVE');
  const cockpitCamera = useVehicleStream(selectedCarId, 'COCKPIT');
  const { latestLocations: fleetLocations } = useFleetLocation({ cars });

  const mainCarProgress =
    fleetLocations.find((l) => l.vehicleId === selectedCarId)?.lapProgress ?? 0;

  const liveRivals = useMemo(() => {
    return cars
      .filter((car) => car.id !== selectedCarId)
      .map((car) => {
        const loc = fleetLocations.find((l) => l.vehicleId === car.id);
        return {
          id: car.id,
          name: driverNamesByCarId.get(car.id) ?? car.number,
          color: car.color ?? '#6b7280',
          progress: loc?.lapProgress ?? 0,
        };
      });
  }, [cars, selectedCarId, fleetLocations, driverNamesByCarId]);
  const carNumber = activeCar?.number ?? '00';
  const mainStreamCandidates = useMemo(() => {
    const candidates = [
      {
        url: toPreferredLiveUrl(liveCamera.streamUrl),
        mimeType: liveCamera.streamMimeType ?? 'video/mp4',
      },
      {
        url: liveCamera.streamUrl,
        mimeType: liveCamera.streamMimeType ?? 'video/mp4',
      },
      {
        url: cockpitCamera.streamUrl,
        mimeType: cockpitCamera.streamMimeType ?? 'video/mp4',
      },
      {
        url: toHttpFallbackUrl(cockpitCamera.streamUrl),
        mimeType: cockpitCamera.streamMimeType ?? 'video/mp4',
      },
    ].filter((candidate): candidate is { url: string; mimeType: string } =>
      Boolean(candidate.url)
    );

    const seen = new Set<string>();
    return candidates.filter((candidate) => {
      if (seen.has(candidate.url)) {
        return false;
      }
      seen.add(candidate.url);
      return true;
    });
  }, [
    liveCamera.streamUrl,
    liveCamera.streamMimeType,
    cockpitCamera.streamUrl,
    cockpitCamera.streamMimeType,
  ]);

  const streamFallbackSeed = `${selectedCarId ?? 'none'}:${liveCamera.streamUrl ?? ''}:${cockpitCamera.streamUrl ?? ''}`;
  const [failedMainStreamUrlsBySeed, setFailedMainStreamUrlsBySeed] = useState<
    Record<string, string[]>
  >({});
  const failedMainStreamUrls = useMemo(
    () => failedMainStreamUrlsBySeed[streamFallbackSeed] ?? [],
    [failedMainStreamUrlsBySeed, streamFallbackSeed]
  );

  const activeMainStream = useMemo(() => {
    return (
      mainStreamCandidates.find(
        (candidate) => !failedMainStreamUrls.includes(candidate.url)
      ) ?? null
    );
  }, [failedMainStreamUrls, mainStreamCandidates]);

  const activeMainStreamUrl = activeMainStream?.url ?? null;
  const activeMainStreamMimeType = activeMainStream?.mimeType ?? 'video/mp4';
  const isWsStream = Boolean(activeMainStreamUrl?.match(/^wss?:\/\//i));
  const youtubeEmbedUrl = toYouTubeEmbedUrl(activeMainStreamUrl);
  const canFallbackMainStream = Boolean(activeMainStreamUrl);

  const mainStreamPlayerKey = `${selectedCarId ?? 'none'}:${activeMainStreamUrl ?? 'empty'}`;

  const handleMainStreamError = useCallback(() => {
    if (!canFallbackMainStream || !activeMainStreamUrl) {
      return;
    }

    setFailedMainStreamUrlsBySeed((prev) => {
      const failedForSeed = prev[streamFallbackSeed] ?? [];
      if (failedForSeed.includes(activeMainStreamUrl)) {
        return prev;
      }

      return {
        ...prev,
        [streamFallbackSeed]: [...failedForSeed, activeMainStreamUrl],
      };
    });
  }, [activeMainStreamUrl, canFallbackMainStream, streamFallbackSeed]);

  const cameraLabel = `${cockpitCamera.camera ?? 'COCKPIT'} CAM`;

  return (
    <div className="flex h-screen w-full flex-col gap-4 overflow-hidden p-6 text-white">
      <PageHeader
        title="Live Broadcast"
        subtitle="Official Organizer Stream • Buriram"
        actions={
          <ActiveVehicleSelect
            value={selectedCarId}
            displayLabel={`#${activeCar?.number ?? '--'} - ${activeDriver?.name ?? 'Unassigned'}`}
            options={[...cars]
              .sort((a, b) => Number(a.number) - Number(b.number))
              .map((car) => ({
                id: car.id,
                label: `#${car.number} - ${driverNamesByCarId.get(car.id) ?? 'Driver'}`,
              }))}
            onChange={setActiveCarId}
          />
        }
      />

      {/* Top Row: Map + YouTube (2 Big Boxes) */}
      <div className="grid min-h-75 flex-1 grid-cols-12 gap-6">
        {/* Box 1: Live Map (4/12 width) */}
        <div className="col-span-4 h-full">
          <MapWidget
            circuit={getCircuit(activeCircuitId)}
            activeFlag={null}
            mainCarProgress={mainCarProgress}
            rivals={liveRivals}
            className="border border-white/5"
          />
        </div>

        {/* Box 2: Main video feed (8/12 width) */}
        <div className="glass-panel group relative col-span-8 overflow-hidden rounded-xl border border-white/5">
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            {youtubeEmbedUrl ? (
              <iframe
                key={mainStreamPlayerKey}
                className="h-full w-full"
                src={youtubeEmbedUrl}
                title="Live YouTube stream"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : isWsStream && activeMainStreamUrl ? (
              <OvenStreamPlayer
                key={mainStreamPlayerKey}
                streamUrl={activeMainStreamUrl}
                className="h-full w-full"
                title="Live widget stream"
                onError={handleMainStreamError}
              />
            ) : activeMainStreamUrl ? (
              <video
                key={mainStreamPlayerKey}
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                controls
                preload="auto"
                onError={handleMainStreamError}
              >
                <source
                  src={activeMainStreamUrl ?? undefined}
                  type={activeMainStreamMimeType}
                />
              </video>
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
                No live stream available
              </div>
            )}
          </div>
          {/* Overlay Gradient */}
          <div className="pointer-events-none absolute inset-0 rounded-xl border-4 border-white/5 shadow-[inset_0_0_100px_rgba(0,0,0,0.8)]"></div>
        </div>
      </div>

      {/* Bottom Row: Cockpit Camera */}
      <div className="grid h-[35%] min-h-50 grid-cols-1 gap-6">
        <CameraFeed
          key={`${selectedCarId}:${cockpitCamera.camera ?? 'COCKPIT'}`}
          label={cameraLabel}
          carNumber={carNumber}
          position={cockpitCamera.camera ?? 'COCKPIT'}
          streamUrl={cockpitCamera.streamUrl}
          streamMimeType={cockpitCamera.streamMimeType}
          resetKey={`${selectedCarId}:${cockpitCamera.camera ?? 'COCKPIT'}:${cockpitCamera.streamUrl ?? 'loading'}`}
        />
      </div>
    </div>
  );
}
