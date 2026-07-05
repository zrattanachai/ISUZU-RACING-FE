/**
 * @deprecated
 * This hook predates the multi-channel WebSocket architecture.
 * Prefer the purpose-built hooks instead:
 *   - useVehicleTelemetry  → vehicle.telemetry channel
 *   - useVehicleAlerts     → vehicle.alert channel
 *   - useVehicleLocation   → vehicle.location channel
 *   - useVehicleBiometrics → vehicle.biometric channel
 *   - useVehicleStatus     → vehicle.status channel
 *   - useVehicleAnomaly    → vehicle.anomaly channel
 *
 * All new hooks share one Socket.IO connection via `src/lib/websocket.ts`.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { getWebSocket } from '@/lib/websocket';

export interface TelemetryData {
  carId: string;
  timestamp: number;
  speed: number;
  rpm: number;
  temperatures: {
    engine: number;
  };
}

export function useTelemetrySocket(carId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socketInstance = getWebSocket();

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      setIsConnected(true);
      if (carId) {
        socketInstance.emit('subscribe_car', { carId });
      }
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('telemetry_update', (data: TelemetryData) => {
      setTelemetry(data);
    });

    if (!socketInstance.connected) {
      socketInstance.connect();
    }

    return () => {
      socketInstance.off('connect');
      socketInstance.off('disconnect');
      socketInstance.off('telemetry_update');
      socketRef.current = null;
    };
  }, [carId]);

  // Expose a method for manual re-subscription
  const subscribeToCar = useCallback(
    (id: string) => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('subscribe_car', { carId: id });
      }
    },
    [isConnected]
  );

  return { telemetry, isConnected, subscribeToCar };
}
