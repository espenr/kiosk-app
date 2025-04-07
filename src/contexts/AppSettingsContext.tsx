import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '../utils/storage';

/**
 * Application settings
 */
export interface AppSettings {
  // General settings
  general: {
    appName: string;
    startupMode: 'normal' | 'kiosk' | 'presentation';
    language: string;
    autoSave: boolean;
    autoRefresh: boolean;
    refreshInterval: number; // In milliseconds
    timezone: string; // IANA timezone
  };
  
  // Display settings
  display: {
    fullscreen: boolean;
    showClock: boolean;
    showControls: boolean;
    controlsTimeout: number; // In milliseconds
    controlsPosition: 'top' | 'bottom' | 'left' | 'right';
    screenSaver: {
      enabled: boolean;
      timeout: number; // In milliseconds
      type: 'blank' | 'photos' | 'clock';
    };
  };
  
  // Network settings
  network: {
    offlineMode: boolean;
    cacheStrategy: 'network-first' | 'cache-first' | 'network-only' | 'cache-only';
    connectionCheck: {
      enabled: boolean;
      interval: number; // In milliseconds
      url: string;
    };
  };
  
  // Privacy settings
  privacy: {
    allowCookies: boolean;
    allowTracking: boolean;
    allowErrorReporting: boolean;
    storeCredentials: boolean;
  };
  
  // Advanced settings
  advanced: {
    debugMode: boolean;
    experimentalFeatures: boolean;
    widgetRefreshIndividually: boolean;
    useHardwareAcceleration: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error' | 'none';
  };
}

// Default application settings
const defaultAppSettings: AppSettings = {
  general: {
    appName: 'Kiosk App',
    startupMode: 'normal',
    language: 'en',
    autoSave: true,
    autoRefresh: true,
    refreshInterval: 900000, // 15 minutes
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  },
  display: {
    fullscreen: false,
    showClock: true,
    showControls: true,
    controlsTimeout: 3000, // 3 seconds
    controlsPosition: 'bottom',
    screenSaver: {
      enabled: true,
      timeout: 1800000, // 30 minutes
      type: 'photos',
    },
  },
  network: {
    offlineMode: false,
    cacheStrategy: 'network-first',
    connectionCheck: {
      enabled: true,
      interval: 60000, // 1 minute
      url: 'https://www.google.com',
    },
  },
  privacy: {
    allowCookies: true,
    allowTracking: false,
    allowErrorReporting: true,
    storeCredentials: false,
  },
  advanced: {
    debugMode: false,
    experimentalFeatures: false,
    widgetRefreshIndividually: true,
    useHardwareAcceleration: true,
    logLevel: 'error',
  },
};

// Context interface
interface AppSettingsContextType {
  settings: AppSettings;
  updateSettings: (settings: Partial<AppSettings>) => void;
  updateGeneralSettings: (settings: Partial<AppSettings['general']>) => void;
  updateDisplaySettings: (settings: Partial<AppSettings['display']>) => void;
  updateNetworkSettings: (settings: Partial<AppSettings['network']>) => void;
  updatePrivacySettings: (settings: Partial<AppSettings['privacy']>) => void;
  updateAdvancedSettings: (settings: Partial<AppSettings['advanced']>) => void;
  resetSettings: () => void;
  isLoading: boolean;
  error: Error | null;
}

// Create context with default values
const AppSettingsContext = createContext<AppSettingsContextType>({
  settings: defaultAppSettings,
  updateSettings: () => {},
  updateGeneralSettings: () => {},
  updateDisplaySettings: () => {},
  updateNetworkSettings: () => {},
  updatePrivacySettings: () => {},
  updateAdvancedSettings: () => {},
  resetSettings: () => {},
  isLoading: false,
  error: null,
});

// Provider component
export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => 
    loadFromStorage<AppSettings>(STORAGE_KEYS.SETTINGS, defaultAppSettings)
  );
  // Using loading state for future async operations
  const [isLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Update entire settings object
  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prevSettings) => {
      // Use a simple object spread for the top-level properties
      // and then handle nested properties manually
      const updatedSettings: AppSettings = {
        ...prevSettings,
        ...newSettings,
        // Handle nested properties if present in newSettings
        general: newSettings.general 
          ? { ...prevSettings.general, ...newSettings.general } 
          : prevSettings.general,
        display: newSettings.display 
          ? { 
              ...prevSettings.display, 
              ...newSettings.display,
              // Handle nested screenSaver property
              screenSaver: newSettings.display?.screenSaver
                ? { ...prevSettings.display.screenSaver, ...newSettings.display.screenSaver }
                : prevSettings.display.screenSaver
            } 
          : prevSettings.display,
        network: newSettings.network 
          ? { 
              ...prevSettings.network, 
              ...newSettings.network,
              // Handle nested connectionCheck property
              connectionCheck: newSettings.network?.connectionCheck
                ? { ...prevSettings.network.connectionCheck, ...newSettings.network.connectionCheck }
                : prevSettings.network.connectionCheck
            } 
          : prevSettings.network,
        privacy: newSettings.privacy 
          ? { ...prevSettings.privacy, ...newSettings.privacy } 
          : prevSettings.privacy,
        advanced: newSettings.advanced 
          ? { ...prevSettings.advanced, ...newSettings.advanced } 
          : prevSettings.advanced,
      };
      
      return updatedSettings;
    });
  };

  // Update general settings section
  const updateGeneralSettings = (generalSettings: Partial<AppSettings['general']>) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      general: {
        ...prevSettings.general,
        ...generalSettings,
      },
    }));
  };

  // Update display settings section
  const updateDisplaySettings = (displaySettings: Partial<AppSettings['display']>) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      display: {
        ...prevSettings.display,
        ...displaySettings,
        screenSaver: {
          ...prevSettings.display.screenSaver,
          ...(displaySettings.screenSaver || {}),
        },
      },
    }));
  };

  // Update network settings section
  const updateNetworkSettings = (networkSettings: Partial<AppSettings['network']>) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      network: {
        ...prevSettings.network,
        ...networkSettings,
        connectionCheck: {
          ...prevSettings.network.connectionCheck,
          ...(networkSettings.connectionCheck || {}),
        },
      },
    }));
  };

  // Update privacy settings section
  const updatePrivacySettings = (privacySettings: Partial<AppSettings['privacy']>) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      privacy: {
        ...prevSettings.privacy,
        ...privacySettings,
      },
    }));
  };

  // Update advanced settings section
  const updateAdvancedSettings = (advancedSettings: Partial<AppSettings['advanced']>) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      advanced: {
        ...prevSettings.advanced,
        ...advancedSettings,
      },
    }));
  };

  // Reset settings to defaults
  const resetSettings = () => {
    setSettings(defaultAppSettings);
  };

  // Save settings to localStorage when they change
  useEffect(() => {
    try {
      saveToStorage(STORAGE_KEYS.SETTINGS, settings);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save settings'));
    }
  }, [settings]);

  return (
    <AppSettingsContext.Provider
      value={{
        settings,
        updateSettings,
        updateGeneralSettings,
        updateDisplaySettings,
        updateNetworkSettings,
        updatePrivacySettings,
        updateAdvancedSettings,
        resetSettings,
        isLoading,
        error,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

// Custom hook to use the app settings context
export const useAppSettings = () => useContext(AppSettingsContext);