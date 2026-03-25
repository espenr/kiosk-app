import { useEffect, useRef } from 'react';
import { checkVersion } from '@/services/version';

const VERSION_KEY = '__kiosk_app_version__';
const WATCHDOG_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
let lastHeartbeat = Date.now();
let watchdogInterval: number | null = null;

/**
 * Setup watchdog timer to detect UI freeze
 */
function setupWatchdog() {
  if (watchdogInterval) return watchdogInterval;

  watchdogInterval = window.setInterval(() => {
    const timeSinceHeartbeat = Date.now() - lastHeartbeat;

    if (timeSinceHeartbeat > WATCHDOG_TIMEOUT_MS) {
      console.error('[Watchdog] No heartbeat for 5 minutes, app may be frozen. Reloading...');
      if (watchdogInterval) clearInterval(watchdogInterval);
      window.location.reload();
    }
  }, 60000); // Check every minute

  return watchdogInterval;
}

/**
 * Hook to check for version updates and reload page when new version is deployed
 * Polls every 30 seconds, clears localStorage and reloads if version changes
 */
export function useVersionCheck() {
  const currentVersionRef = useRef<string | null>(null);

  useEffect(() => {
    // Get initial version
    const initVersion = async () => {
      const version = await checkVersion();
      currentVersionRef.current = version;
      console.log('Initial version:', version);
      lastHeartbeat = Date.now(); // Update watchdog
    };

    initVersion();

    // Setup watchdog timer
    const watchdog = setupWatchdog();

    // Poll for version changes every 30 seconds
    const interval = setInterval(async () => {
      lastHeartbeat = Date.now(); // Update watchdog heartbeat
      const newVersion = await checkVersion();

      // If we have a current version and it changed, reload the page
      if (
        currentVersionRef.current &&
        currentVersionRef.current !== 'unknown' &&
        newVersion !== 'unknown' &&
        newVersion !== currentVersionRef.current
      ) {
        console.log(
          `New version detected: ${currentVersionRef.current} -> ${newVersion}`
        );
        console.log('Clearing localStorage and reloading for clean start...');

        // Clear localStorage before reload (except version key)
        localStorage.clear();
        localStorage.setItem(VERSION_KEY, newVersion);

        // Give a brief moment for the operations to complete
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(interval);
      if (watchdog) clearInterval(watchdog);
    };
  }, []);
}
