import { useEffect, useRef } from 'react';
import { checkVersion } from '@/services/version';

/**
 * Hook to check for version updates and reload page when new version is deployed
 * Polls every 30 seconds and reloads if version changes
 */
export function useVersionCheck() {
  const currentVersionRef = useRef<string | null>(null);

  useEffect(() => {
    // Get initial version
    const initVersion = async () => {
      const version = await checkVersion();
      currentVersionRef.current = version;
      console.log('Initial version:', version);
    };

    initVersion();

    // Poll for version changes every 30 seconds
    const interval = setInterval(async () => {
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
        console.log('Reloading page to load new version...');

        // Give a brief moment for the log to be written
        setTimeout(() => {
          window.location.reload();
        }, 100);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);
}
