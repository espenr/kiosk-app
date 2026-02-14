import { createContext, ReactNode, useContext, useState, useEffect } from 'react';
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '../utils/storage';

// Kiosk configuration for API integrations and settings
export interface KioskConfig {
  location: {
    latitude: number;
    longitude: number;
    stopPlaceId: string; // Entur stop ID for Vikhammeråsen
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

// Default configuration (Trondheim area)
const defaultConfig: KioskConfig = {
  location: {
    latitude: 63.4305,
    longitude: 10.3951,
    stopPlaceId: '', // User needs to configure
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

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<KioskConfig>(() =>
    loadFromStorage(STORAGE_KEYS.CONFIG, defaultConfig)
  );

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
  const isConfigured = Boolean(config.location.stopPlaceId);

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
