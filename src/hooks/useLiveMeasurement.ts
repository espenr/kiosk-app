import { useState, useEffect, useRef, useCallback } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { TibberLiveConnection, LiveMeasurement } from '../services/tibber';

export interface UseLiveMeasurementResult {
  measurement: LiveMeasurement | null;
  isConnected: boolean;
  error: string | null;
}

/**
 * Hook to subscribe to live power measurements from Tibber Pulse
 * Requires homeId from useElectricity hook
 */
export function useLiveMeasurement(
  homeId: string | null,
  realTimeEnabled: boolean
): UseLiveMeasurementResult {
  const { config } = useConfig();
  const token = config.apiKeys.tibber;

  const [measurement, setMeasurement] = useState<LiveMeasurement | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectionRef = useRef<TibberLiveConnection | null>(null);

  const handleMeasurement = useCallback((data: LiveMeasurement) => {
    setMeasurement(data);
    setIsConnected(true);
    setError(null);
  }, []);

  const handleError = useCallback((err: string) => {
    setError(err);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    // Don't connect if missing requirements
    if (!token || !homeId || !realTimeEnabled) {
      return;
    }

    // Create and connect
    connectionRef.current = new TibberLiveConnection(
      token,
      homeId,
      handleMeasurement,
      handleError
    );
    connectionRef.current.connect();

    // Cleanup on unmount
    return () => {
      connectionRef.current?.disconnect();
      connectionRef.current = null;
    };
  }, [token, homeId, realTimeEnabled, handleMeasurement, handleError]);

  return { measurement, isConnected, error };
}
