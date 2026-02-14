import { ReactNode } from 'react';
import { ConfigProvider } from './ConfigContext';
import { ThemeProvider } from './ThemeContext';

/**
 * Central context provider that combines all application contexts
 */
export function AppContextProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </ConfigProvider>
  );
}
