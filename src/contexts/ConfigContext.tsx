import { createContext, ReactNode, useContext, useState, useEffect } from 'react';
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '../utils/storage';
import { getConfig, getPublicConfig } from '../services/auth';
import { invalidateCalendarCache } from '../hooks/useCalendar';

// Kiosk configuration for API integrations and settings
export interface KioskConfig {
  location: {
    latitude: number;
    longitude: number;
    stopPlaceIds: string[]; // Entur stop IDs (NSR:StopPlace:xxxxx)
  };
  apiKeys: {
    tibber: string;
  };
  electricity: {
    gridFee: number; // Grid fee (nettleie) in kr/kWh - added to Tibber price
  };
  photos: {
    sharedAlbumUrl: string;
    interval: number; // seconds between slides
  };
  calendar: {
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    calendars: CalendarSource[];
  };
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
    gridFee: 0.36, // Default grid fee ~36 øre/kWh (typical for Tensio/Trondheim)
  },
  photos: {
    sharedAlbumUrl: '',
    interval: 30,
  },
  calendar: {
    clientId: undefined,
    clientSecret: undefined,
    refreshToken: undefined,
    calendars: [],
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
  isConfigured: boolean;
  isServerBacked: boolean;
  syncWithServer: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType>({
  config: defaultConfig,
  updateConfig: () => {},
  updateLocation: () => {},
  updateApiKeys: () => {},
  updateElectricity: () => {},
  updatePhotos: () => {},
  updateCalendar: () => {},
  isConfigured: false,
  isServerBacked: false,
  syncWithServer: async () => {},
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
  return {
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
      // Preserve calendars array from storage (don't merge with empty default)
      calendars: stored.calendar?.calendars || defaultConfig.calendar.calendars,
    },
  };
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<KioskConfig>(() => {
    const stored = loadFromStorage<Partial<KioskConfig>>(STORAGE_KEYS.CONFIG, {});
    return mergeWithDefaults(stored);
  });

  const [isServerBacked, setIsServerBacked] = useState(false);

  // Try to load from server on mount
  useEffect(() => {
    const loadFromServer = async () => {
      const isAdminRoute = window.location.pathname.startsWith('/admin');

      // Only try authenticated config on admin routes
      if (isAdminRoute) {
        try {
          const serverConfig = await getConfig();
          console.log('[ConfigContext] Loaded config from server (authenticated)');
          setConfig(serverConfig);
          setIsServerBacked(true);
          return; // Success, no need for fallback
        } catch {
          // Auth failed on admin route, fall through to public config
          console.log('[ConfigContext] Auth failed on admin route, falling back to public config');
        }
      }

      // For dashboard or if admin auth failed, load public config
      try {
        const publicConfig = await getPublicConfig();
        console.log('[ConfigContext] Loaded public config from server');
        // Merge public config with localStorage for missing fields
        const stored = loadFromStorage<Partial<KioskConfig>>(STORAGE_KEYS.CONFIG, {});
        const merged = mergeWithDefaults({ ...stored, ...publicConfig });
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

  // Save to localStorage when config changes (fallback only)
  useEffect(() => {
    if (!isServerBacked) {
      saveToStorage(STORAGE_KEYS.CONFIG, config);
    }
  }, [config, isServerBacked]);

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

  // Sync config from server
  const syncWithServer = async () => {
    try {
      const serverConfig = await getConfig();
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
        isConfigured,
        isServerBacked,
        syncWithServer,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
