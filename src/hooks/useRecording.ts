import { useCallback } from 'react';
import { useRecordingContext } from '@/context/RecordingContext';
import type { RecordingSourcePage } from '@/types';

// Re-export so callers that import RecordingState from here still work
export type { RecordingState } from '@/context/RecordingContext';

interface UseRecordingOptions {
  vehicleId: number;
  sourcePage: RecordingSourcePage;
  requestedBy: string;
}

export function useRecording({ vehicleId }: UseRecordingOptions) {
  const ctx = useRecordingContext();

  // Bind vehicleId so callers can do: recording.handleStart('Engineering_Session')
  const handleStart = useCallback(
    (defaultPrefix: string) => ctx.handleStart(vehicleId, defaultPrefix),
    [ctx, vehicleId]
  );

  return {
    ...ctx,
    handleStart,
  };
}
