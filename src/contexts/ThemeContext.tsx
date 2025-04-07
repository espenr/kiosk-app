import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '../utils/storage';

// Theme configuration
export interface ThemeConfig {
  colorMode: 'light' | 'dark';
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontSizeBase: number; // Base font size in pixels
  highContrast: boolean;
}

// Default theme configuration
const defaultThemeConfig: ThemeConfig = {
  colorMode: 'dark',
  primaryColor: 'teal.500',
  backgroundColor: 'gray.900',
  textColor: 'white',
  accentColor: 'blue.400',
  fontSizeBase: 16,
  highContrast: false,
};

// Theme context interface
interface ThemeContextType {
  themeConfig: ThemeConfig;
  updateThemeConfig: (config: Partial<ThemeConfig>) => void;
  toggleColorMode: () => void;
  toggleHighContrast: () => void;
}

// Create context with default values
const ThemeContext = createContext<ThemeContextType>({
  themeConfig: defaultThemeConfig,
  updateThemeConfig: () => {},
  toggleColorMode: () => {},
  toggleHighContrast: () => {},
});

// Theme provider component
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() => 
    loadFromStorage(STORAGE_KEYS.THEME_CONFIG, defaultThemeConfig)
  );

  // Save to local storage when config changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.THEME_CONFIG, themeConfig);
  }, [themeConfig]);

  // Update theme configuration
  const updateThemeConfig = (config: Partial<ThemeConfig>) => {
    setThemeConfig((prevConfig) => ({
      ...prevConfig,
      ...config,
    }));
  };

  // Toggle color mode (light/dark)
  const toggleColorMode = () => {
    setThemeConfig((prevConfig) => ({
      ...prevConfig,
      colorMode: prevConfig.colorMode === 'light' ? 'dark' : 'light',
      backgroundColor: prevConfig.colorMode === 'light' ? 'gray.900' : 'gray.50',
      textColor: prevConfig.colorMode === 'light' ? 'white' : 'gray.800',
    }));
  };

  // Toggle high contrast mode
  const toggleHighContrast = () => {
    setThemeConfig((prevConfig) => ({
      ...prevConfig,
      highContrast: !prevConfig.highContrast,
      textColor: !prevConfig.highContrast ? 'white' : 'yellow.400',
      backgroundColor: !prevConfig.highContrast ? prevConfig.backgroundColor : 'black',
    }));
  };

  return (
    <ThemeContext.Provider
      value={{ themeConfig, updateThemeConfig, toggleColorMode, toggleHighContrast }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);