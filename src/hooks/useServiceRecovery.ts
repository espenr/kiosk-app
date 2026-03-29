import { useCallback } from 'react';
import { checkConnectivity } from '@/services/connectivity';

/**
 * Tibber connection interface for triggering force reconnection
 */
export interface TibberConnectionRef {
  forceReconnect: () => void;
}

/**
 * Hook providing service recovery actions
 * Called when page becomes visible to verify services are healthy
 *
 * Phase 1.1: Added explicit Tibber reconnection on page visibility
 * to reduce TV wake recovery time from 30-60s to <5s
 */
export function useServiceRecovery(tibberConnection?: TibberConnectionRef | null) {
  const checkAndRecover = useCallback(async () => {
    console.log('[ServiceRecovery] Checking services after visibility change...');

    // Check internet connectivity
    const isOnline = await checkConnectivity();
    if (!isOnline) {
      console.warn('[ServiceRecovery] No internet connection detected');
      return;
    }

    // Force Tibber reconnection if available (Phase 1.1)
    if (tibberConnection) {
      console.log('[ServiceRecovery] Triggering Tibber reconnection after wake');
      tibberConnection.forceReconnect();
    }

    console.log('[ServiceRecovery] Online - services will auto-reconnect');
  }, [tibberConnection]);

  return { checkAndRecover };
}
