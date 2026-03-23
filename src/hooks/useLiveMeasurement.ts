import { useState, useEffect, useRef, useCallback } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { TibberLiveConnection, LiveMeasurement, ConnectionState } from '../services/tibber';

const STALENESS_WARNING_MS = 30 * 1000;  // 30 seconds
const STALENESS_ERROR_MS = 60 * 1000;    // 60 seconds

export type DataFreshness = 'fresh' | 'warning' | 'stale';

export interface UseLiveMeasurementResult {
  measurement: LiveMeasurement | null;
  connectionState: ConnectionState;
  error: string | null;
  freshness: DataFreshness;
  lastUpdateSeconds: number | null;
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
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [freshness, setFreshness] = useState<DataFreshness>('fresh');
  const [lastUpdateSeconds, setLastUpdateSeconds] = useState<number | null>(null);

  const connectionRef = useRef<TibberLiveConnection | null>(null);

  const handleMeasurement = useCallback((data: LiveMeasurement) => {
    setMeasurement(data);
    setError(null);
    setFreshness('fresh');
  }, []);

  const handleError = useCallback((err: string) => {
    setError(err);
  }, []);

  const handleStateChange = useCallback((state: ConnectionState) => {
    setConnectionState(state);
    if (state === ConnectionState.DATA_FLOWING) {
      setError(null);
      setFreshness('fresh');
    }
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
      handleError,
      handleStateChange
    );
    connectionRef.current.connect();

    // Cleanup on unmount
    return () => {
      connectionRef.current?.disconnect();
      connectionRef.current = null;
    };
  }, [token, homeId, realTimeEnabled, handleMeasurement, handleError, handleStateChange]);

  // Staleness detection and auto-reconnection
  useEffect(() => {
    if (!connectionRef.current || connectionState !== ConnectionState.DATA_FLOWING) {
      return;
    }

    const checkStaleness = () => {
      const connection = connectionRef.current;
      if (!connection) return;

      const now = Date.now();
      const lastMessageTime = connection.getLastMessageTime();

      if (lastMessageTime === 0) {
        setFreshness('fresh');
        setLastUpdateSeconds(null);
        return;
      }

      const timeSinceLastMessage = now - lastMessageTime;
      const secondsSinceUpdate = Math.floor(timeSinceLastMessage / 1000);
      setLastUpdateSeconds(secondsSinceUpdate);

      if (timeSinceLastMessage > STALENESS_ERROR_MS) {
        console.warn(`[LiveMeasurement] Data stale for ${secondsSinceUpdate}s, forcing reconnect`);
        setFreshness('stale');
        connection.forceReconnect();
      } else if (timeSinceLastMessage > STALENESS_WARNING_MS) {
        console.warn(`[LiveMeasurement] Data stale for ${secondsSinceUpdate}s (warning)`);
        setFreshness('warning');
      } else {
        setFreshness('fresh');
      }
    };

    checkStaleness();
    const interval = setInterval(checkStaleness, 5000);
    return () => clearInterval(interval);
  }, [connectionState]);

  return { measurement, connectionState, error, freshness, lastUpdateSeconds };
}
