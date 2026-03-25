import { useCallback } from 'react';
import { checkConnectivity } from '@/services/connectivity';

/**
 * Hook providing service recovery actions
 * Called when page becomes visible to verify services are healthy
 */
export function useServiceRecovery() {
  const checkAndRecover = useCallback(async () => {
    console.log('[ServiceRecovery] Checking services after visibility change...');

    // Check internet connectivity
    const isOnline = await checkConnectivity();
    if (!isOnline) {
      console.warn('[ServiceRecovery] No internet connection detected');
      return;
    }

    // Services will auto-reconnect via their existing hooks
    console.log('[ServiceRecovery] Online - services will auto-reconnect');
  }, []);

  return { checkAndRecover };
}
