import { createContext, ReactNode, useContext, useState, useEffect, useRef } from 'react';
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '../utils/storage';
import { getConfig, getPublicConfig, autoSaveConfig } from '../services/auth';
import { invalidateCalendarCache } from '../hooks/useCalendar';

// Kiosk configuration for API integrations and settings
export interface KioskConfig {
  location: {
    latitude: number;
    longitude: number;
    stopPlaceIds: string[]; // Entur stop IDs (NSR:StopPlace:xxxxx)
    stopPlaceName?: string; // Cached stop name for display
  };
  apiKeys: {
    tibber: string;
  };
  electricity: {
    gridFee: {
      day: number;   // Day rate (06:00-22:00) in kr/kWh
      night: number; // Night rate (22:00-06:00) in kr/kWh
    };
  };
  photos: {
    sharedAlbumUrl: string;
    interval: number; // seconds between slides
  };
  calendar: {
    serviceAccountKey?: string; // base64-encoded JSON key (only in authenticated config)
    calendars: CalendarSource[];
    configured?: boolean; // Whether service account is configured (from public config)
  };
  transport?: {
    destinationFilter?: {
      mode: 'whitelist' | 'blacklist';
      destinations: string[]; // Destination names to filter (case-insensitive substring match)
    };
  };
  lastModified?: number; // Unix timestamp (ms) for conflict detection
}

// Individual calendar source (one per family member)
export interface CalendarSource {
  id: string;           // Google Calendar ID (email or group ID)
  name: string;         // Display name (e.g., "Pappa", "Mamma", "Emma", "Noah")
  color: string;        // Hex color (e.g., "#4285f4")
  icon?: string;        // Optional emoji icon (e.g., "👨", "👩", "👧", "👦")
}

// Default configuration (Trondheim area - Planetringen)
const defaultConfig: KioskConfig = {
  location: {
    latitude: 63.4325,
    longitude: 10.6379,
    stopPlaceIds: [
      'NSR:StopPlace:41589', // Planetringen
    ],
  },
  apiKeys: {
    tibber: '',
  },
  electricity: {
    gridFee: {
      day: 0.3604,   // Tensio Malvik day rate (06:00-22:00)
      night: 0.2292, // Tensio Malvik night rate (22:00-06:00)
    },
  },
  photos: {
    sharedAlbumUrl: '',
    interval: 30,
  },
  calendar: {
    serviceAccountKey: undefined,
    calendars: [],
    configured: false,
  },
  transport: {
    destinationFilter: {
      mode: 'whitelist',
      destinations: ['Strindheim'], // Only show buses heading towards city center
    },
  },
};

interface ConfigContextType {
  config: KioskConfig;
  updateConfig: (updates: Partial<KioskConfig>) => void;
  updateLocation: (location: Partial<KioskConfig['location']>) => void;
  updateApiKeys: (apiKeys: Partial<KioskConfig['apiKeys']>) => void;
  updateElectricity: (electricity: Partial<KioskConfig['electricity']>) => void;
  updatePhotos: (photos: Partial<KioskConfig['photos']>) => void;
  updateCalendar: (calendar: Partial<KioskConfig['calendar']>) => void;
  updateTransport: (transport: Partial<KioskConfig['transport']>) => void;
  isConfigured: boolean;
  isServerBacked: boolean;
  syncWithServer: () => Promise<void>;
  setIsDirty: (dirty: boolean) => void; // Blocks auto-save during user editing
}

const ConfigContext = createContext<ConfigContextType>({
  config: defaultConfig,
  updateConfig: () => {},
  updateLocation: () => {},
  updateApiKeys: () => {},
  updateElectricity: () => {},
  updatePhotos: () => {},
  updateCalendar: () => {},
  updateTransport: () => {},
  isConfigured: false,
  isServerBacked: false,
  syncWithServer: async () => {},
  setIsDirty: () => {},
});

// Remove undefined values from an object (shallow)
function removeUndefined<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

// Deep merge stored config with defaults to ensure all nested properties exist
// Filters out undefined values so they don't overwrite defaults
function mergeWithDefaults(stored: Partial<KioskConfig>): KioskConfig {
  const merged = {
    location: {
      ...defaultConfig.location,
      ...(stored.location ? removeUndefined(stored.location) : {}),
    },
    apiKeys: {
      ...defaultConfig.apiKeys,
      ...(stored.apiKeys ? removeUndefined(stored.apiKeys) : {}),
    },
    electricity: {
      ...defaultConfig.electricity,
      ...(stored.electricity ? removeUndefined(stored.electricity) : {}),
    },
    photos: {
      ...defaultConfig.photos,
      ...(stored.photos ? removeUndefined(stored.photos) : {}),
    },
    calendar: {
      ...defaultConfig.calendar,
      ...(stored.calendar ? removeUndefined(stored.calendar) : {}),
      // calendars array is already included in the spread above - no override needed
    },
    transport: {
      ...defaultConfig.transport,
      ...(stored.transport ? removeUndefined(stored.transport) : {}),
    },
  };

  // Migration: If old config has multiple stops, use first one
  if (merged.location.stopPlaceIds.length > 1) {
    console.log('[ConfigContext] Migrating to single stop from', merged.location.stopPlaceIds.length, 'stops');
    merged.location.stopPlaceIds = [merged.location.stopPlaceIds[0]];
  }

  // Migration: Convert old single gridFee to day/night structure
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oldGridFee = (stored.electricity as any)?.gridFee;
  if (typeof oldGridFee === 'number') {
    console.log('[ConfigContext] Migrating single gridFee', oldGridFee, 'to day/night structure');
    merged.electricity.gridFee = {
      day: oldGridFee,
      night: oldGridFee * 0.636, // Estimate night rate as ~63.6% of day rate (based on Tensio rates)
    };
  }

  return merged;
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<KioskConfig>(() => {
    const stored = loadFromStorage<Partial<KioskConfig>>(STORAGE_KEYS.CONFIG, {});
    return mergeWithDefaults(stored);
  });

  const [isServerBacked, setIsServerBacked] = useState(false);
  const [isDirty, setIsDirty] = useState(false); // Blocks auto-save during user editing
  const autoSaveTimeoutRef = useRef<number | null>(null);

  // Try to load from server on mount
  useEffect(() => {
    const loadFromServer = async () => {
      const currentPath = window.location.pathname;
      const isAdminRoute = currentPath.startsWith('/admin');

      // Routes that don't require authentication
      const publicAdminRoutes = ['/admin/login', '/admin/setup', '/admin/recovery'];
      const isPublicAdminRoute = publicAdminRoutes.some(route => currentPath.startsWith(route));

      // Only try authenticated config on admin routes
      if (isAdminRoute) {
        try {
          const serverConfig = await getConfig();
          console.log('[ConfigContext] Loaded config from server (authenticated)');
          setConfig(serverConfig);
          setIsServerBacked(true);
          return; // Success, no need for fallback
        } catch {
          // Auth failed on admin route
          console.log('[ConfigContext] Auth failed on admin route');

          // Redirect to login if on a protected admin route
          if (!isPublicAdminRoute) {
            console.log('[ConfigContext] Redirecting to login (session expired)');
            window.location.href = '/admin/login';
            return;
          }

          // Public admin routes (login, setup, recovery) can continue to load public config
          console.log('[ConfigContext] On public admin route, falling back to public config');
        }
      }

      // For dashboard or if admin auth failed, load public config
      try {
        const publicConfig = await getPublicConfig();
        console.log('[ConfigContext] Loaded public config from server');
        // Merge public config with localStorage for missing fields
        const stored = loadFromStorage<Partial<KioskConfig>>(STORAGE_KEYS.CONFIG, {});

        // CRITICAL: Ensure server calendar data overrides localStorage
        // This fixes the bug where calendar colors would revert after page reload
        const mergeInput = {
          ...stored,
          ...publicConfig,
          // Explicitly preserve server calendar to prevent localStorage from overriding
          calendar: publicConfig.calendar || stored.calendar || defaultConfig.calendar,
        };

        const merged = mergeWithDefaults(mergeInput);

        // Compare timestamps for migration from localStorage → server
        const storedTimestamp = stored.lastModified || 0;
        const serverTimestamp = (publicConfig as Partial<KioskConfig>).lastModified || 0;

        if (storedTimestamp > serverTimestamp && Object.keys(stored).length > 0) {
          console.log('[ConfigContext] localStorage is newer than server, may need migration', {
            stored: storedTimestamp,
            server: serverTimestamp,
          });
          // Note: Migration will happen when user next saves in admin view
        }

        setConfig(merged);
        setIsServerBacked(true);
      } catch {
        // Server not available - fall back to localStorage
        console.log('[ConfigContext] Server unavailable, using localStorage fallback');
        setIsServerBacked(false);
      }
    };

    loadFromServer();
  }, []);

  // Poll for config updates on dashboard (not on admin routes)
  useEffect(() => {
    const currentPath = window.location.pathname;
    const isAdminRoute = currentPath.startsWith('/admin');

    // Only poll on dashboard, not in admin
    if (isAdminRoute || !isServerBacked) {
      return;
    }

    const pollInterval = 10000; // 10 seconds

    const pollForUpdates = async () => {
      try {
        const publicConfig = await getPublicConfig();
        const serverTimestamp = (publicConfig as Partial<KioskConfig>).lastModified || 0;
        const currentTimestamp = config.lastModified || 0;

        console.log('[ConfigContext] Polling for updates', {
          current: currentTimestamp,
          server: serverTimestamp,
          needsUpdate: serverTimestamp > currentTimestamp,
        });

        // If server config is newer, update
        if (serverTimestamp > currentTimestamp) {
          console.log('[ConfigContext] Config updated on server, reloading');
          const stored = loadFromStorage<Partial<KioskConfig>>(STORAGE_KEYS.CONFIG, {});

          // Ensure server calendar data overrides localStorage (same as initial load)
          const mergeInput = {
            ...stored,
            ...publicConfig,
            calendar: publicConfig.calendar || stored.calendar || defaultConfig.calendar,
          };

          const merged = mergeWithDefaults(mergeInput);
          setConfig(merged);

          // Invalidate calendar cache to force re-fetch with new credentials
          invalidateCalendarCache();
        }
      } catch (err) {
        console.error('[ConfigContext] Poll failed:', err);
      }
    };

    const intervalId = setInterval(pollForUpdates, pollInterval);
    return () => clearInterval(intervalId);
  }, [config.lastModified, isServerBacked]);

  // Save to localStorage when config changes (fallback only)
  useEffect(() => {
    if (!isServerBacked) {
      saveToStorage(STORAGE_KEYS.CONFIG, config);
    }
  }, [config, isServerBacked]);

  // Auto-save to server when config changes (debounced, respects dirty flag)
  useEffect(() => {
    // Only auto-save if server-backed, not during user editing, and not on initial mount
    if (!isServerBacked || isDirty) {
      return;
    }

    // Skip if this is the initial default config (no timestamp yet)
    if (!config.lastModified) {
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current !== null) {
      window.clearTimeout(autoSaveTimeoutRef.current);
    }

    // Debounce auto-save by 1 second
    autoSaveTimeoutRef.current = window.setTimeout(() => {
      autoSaveConfig(config)
        .then((updatedConfig) => {
          console.log('[ConfigContext] Auto-saved config to server', {
            timestamp: updatedConfig.lastModified,
          });
          // Update local config with server's timestamp
          setConfig(updatedConfig);
        })
        .catch((err) => {
          console.error('[ConfigContext] Auto-save failed:', err);
          // Fall back to localStorage on error
          setIsServerBacked(false);
        });
    }, 1000);

    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current !== null) {
        window.clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [config, isServerBacked, isDirty]);

  const updateConfig = (updates: Partial<KioskConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updateLocation = (location: Partial<KioskConfig['location']>) => {
    setConfig(prev => ({
      ...prev,
      location: { ...prev.location, ...location },
    }));
  };

  const updateApiKeys = (apiKeys: Partial<KioskConfig['apiKeys']>) => {
    setConfig(prev => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, ...apiKeys },
    }));
  };

  const updateElectricity = (electricity: Partial<KioskConfig['electricity']>) => {
    setConfig(prev => ({
      ...prev,
      electricity: { ...prev.electricity, ...electricity },
    }));
  };

  const updatePhotos = (photos: Partial<KioskConfig['photos']>) => {
    setConfig(prev => ({
      ...prev,
      photos: { ...prev.photos, ...photos },
    }));
  };

  const updateCalendar = (calendar: Partial<KioskConfig['calendar']>) => {
    setConfig(prev => ({
      ...prev,
      calendar: { ...prev.calendar, ...calendar },
    }));
  };

  const updateTransport = (transport: Partial<KioskConfig['transport']>) => {
    setConfig(prev => ({
      ...prev,
      transport: { ...prev.transport, ...transport },
    }));
  };

  // Sync config from server (respects dirty flag to avoid overwriting user edits)
  const syncWithServer = async () => {
    // Block sync during user editing to prevent race conditions
    if (isDirty) {
      console.log('[ConfigContext] Skipping sync (user is editing)');
      return;
    }

    try {
      const serverConfig = await getConfig();

      // Compare timestamps for conflict detection
      const currentTimestamp = config.lastModified || 0;
      const serverTimestamp = serverConfig.lastModified || 0;

      if (currentTimestamp > serverTimestamp) {
        // Local config is newer - log conflict but allow override
        console.warn('[ConfigContext] Local config is newer than server', {
          local: currentTimestamp,
          server: serverTimestamp,
          diff: currentTimestamp - serverTimestamp,
        });
        // Still use server config since syncWithServer was explicitly called
      } else if (serverTimestamp > currentTimestamp) {
        console.log('[ConfigContext] Server config is newer', {
          local: currentTimestamp,
          server: serverTimestamp,
          diff: serverTimestamp - currentTimestamp,
        });
      }

      console.log('[ConfigContext] Synced config from server');

      // Invalidate calendar cache when config changes
      invalidateCalendarCache();

      setConfig(serverConfig);
      setIsServerBacked(true);
    } catch (err) {
      console.error('[ConfigContext] Failed to sync with server:', err);
      // Keep current config and fallback to localStorage
      setIsServerBacked(false);
    }
  };

  // Check if minimum required settings are configured
  const isConfigured = config.location.stopPlaceIds.length > 0;

  return (
    <ConfigContext.Provider
      value={{
        config,
        updateConfig,
        updateLocation,
        updateApiKeys,
        updateElectricity,
        updatePhotos,
        updateCalendar,
        updateTransport,
        isConfigured,
        isServerBacked,
        syncWithServer,
        setIsDirty,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
