import { useState, useEffect, useCallback, useRef } from 'react';
import { checkConnectivity } from '@/services/connectivity';

type ConnectivityStatus = 'online' | 'offline' | 'reconnecting';

interface ConnectivityState {
  status: ConnectivityStatus;
  isOnline: boolean;
  lastChecked: Date | null;
  downtimeStart: Date | null;
  downtimeDuration: number; // in seconds
}

export function useConnectivity() {
  const [state, setState] = useState<ConnectivityState>({
    status: 'online',
    isOnline: true, // Assume online initially
    lastChecked: null,
    downtimeStart: null,
    downtimeDuration: 0,
  });

  const previousOnlineRef = useRef<boolean>(true);

  const checkStatus = useCallback(async () => {
    const wasOnline = previousOnlineRef.current;
    const isOnline = await checkConnectivity();
    const now = new Date();

    setState((prev) => {
      let status: ConnectivityStatus = 'online';
      let downtimeStart = prev.downtimeStart;
      let downtimeDuration = prev.downtimeDuration;

      if (!isOnline) {
        // Currently offline
        status = 'offline';
        if (!downtimeStart) {
          // Just went offline
          downtimeStart = now;
          downtimeDuration = 0;
        }
      } else if (!wasOnline && isOnline) {
        // Reconnecting (was offline, now back online)
        status = 'reconnecting';
        // Will transition to online after a brief moment
        setTimeout(() => {
          setState((s) => ({
            ...s,
            status: 'online',
            downtimeStart: null,
            downtimeDuration: 0,
          }));
        }, 2000); // Show "Reconnecting..." for 2 seconds
      } else {
        // Already online
        status = 'online';
        downtimeStart = null;
        downtimeDuration = 0;
      }

      return {
        status,
        isOnline,
        lastChecked: now,
        downtimeStart,
        downtimeDuration,
      };
    });

    previousOnlineRef.current = isOnline;
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Check every 10 seconds
  useEffect(() => {
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  // Update downtime duration every second when offline
  useEffect(() => {
    if (state.status !== 'offline' || !state.downtimeStart) {
      return;
    }

    const interval = setInterval(() => {
      setState((prev) => {
        if (!prev.downtimeStart) return prev;
        const duration = Math.floor(
          (Date.now() - prev.downtimeStart.getTime()) / 1000
        );
        return { ...prev, downtimeDuration: duration };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [state.status, state.downtimeStart]);

  return state;
}
