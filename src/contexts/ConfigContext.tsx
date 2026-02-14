import { createContext, ReactNode, useContext, useState, useEffect } from 'react';
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '../utils/storage';

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
  photos: {
    sharedAlbumUrl: string;
    interval: number; // seconds between slides
  };
  calendar: {
    refreshToken?: string;
    calendarId?: string;
  };
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
  photos: {
    sharedAlbumUrl: '',
    interval: 30,
  },
  calendar: {
    refreshToken: undefined,
    calendarId: undefined,
  },
};

interface ConfigContextType {
  config: KioskConfig;
  updateConfig: (updates: Partial<KioskConfig>) => void;
  updateLocation: (location: Partial<KioskConfig['location']>) => void;
  updateApiKeys: (apiKeys: Partial<KioskConfig['apiKeys']>) => void;
  updatePhotos: (photos: Partial<KioskConfig['photos']>) => void;
  updateCalendar: (calendar: Partial<KioskConfig['calendar']>) => void;
  isConfigured: boolean;
}

const ConfigContext = createContext<ConfigContextType>({
  config: defaultConfig,
  updateConfig: () => {},
  updateLocation: () => {},
  updateApiKeys: () => {},
  updatePhotos: () => {},
  updateCalendar: () => {},
  isConfigured: false,
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
    photos: {
      ...defaultConfig.photos,
      ...(stored.photos ? removeUndefined(stored.photos) : {}),
    },
    calendar: {
      ...defaultConfig.calendar,
      ...(stored.calendar ? removeUndefined(stored.calendar) : {}),
    },
  };
}

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<KioskConfig>(() => {
    const stored = loadFromStorage<Partial<KioskConfig>>(STORAGE_KEYS.CONFIG, {});
    return mergeWithDefaults(stored);
  });

  // Save to localStorage when config changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.CONFIG, config);
  }, [config]);

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

  // Check if minimum required settings are configured
  const isConfigured = config.location.stopPlaceIds.length > 0;

  return (
    <ConfigContext.Provider
      value={{
        config,
        updateConfig,
        updateLocation,
        updateApiKeys,
        updatePhotos,
        updateCalendar,
        isConfigured,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export const useConfig = () => useContext(ConfigContext);
