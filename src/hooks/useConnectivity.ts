import { useState, useEffect, useCallback } from 'react';
import { checkConnectivity } from '@/services/connectivity';

interface ConnectivityState {
  isOnline: boolean;
  lastChecked: Date | null;
}

export function useConnectivity() {
  const [state, setState] = useState<ConnectivityState>({
    isOnline: true, // Assume online initially
    lastChecked: null,
  });

  const checkStatus = useCallback(async () => {
    const isOnline = await checkConnectivity();
    setState({
      isOnline,
      lastChecked: new Date(),
    });
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

  return state;
}
