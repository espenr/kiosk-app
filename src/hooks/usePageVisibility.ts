import { useEffect, useRef } from 'react';

export interface PageVisibilityCallbacks {
  onVisible?: () => void;
  onHidden?: () => void;
}

/**
 * Hook to detect page visibility changes (tab focus, screen wake, etc.)
 */
export function usePageVisibility(callbacks: PageVisibilityCallbacks = {}) {
  const lastVisibleTime = useRef<number>(Date.now());
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const now = Date.now();
      const wasHiddenFor = now - lastVisibleTime.current;

      if (document.hidden) {
        console.log('[PageVisibility] Page hidden');
        callbacksRef.current.onHidden?.();
      } else {
        console.log(`[PageVisibility] Page visible (was hidden for ${Math.round(wasHiddenFor / 1000)}s)`);
        lastVisibleTime.current = now;
        callbacksRef.current.onVisible?.();

        // If hidden for >5 minutes, trigger hard refresh
        const FIVE_MINUTES_MS = 5 * 60 * 1000;
        if (wasHiddenFor > FIVE_MINUTES_MS) {
          console.warn('[PageVisibility] Was hidden for >5 min, reloading page for fresh start');
          setTimeout(() => window.location.reload(), 1000);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
}
