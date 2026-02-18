import { ReactNode } from 'react';
import { ConfigProvider } from './ConfigContext';
import { ThemeProvider } from './ThemeContext';

/**
 * Central context provider that combines all application contexts
 */
export function AppContextProvider({ children }: { children: ReactNode }) {
  // Type assertions needed for Preact/React compatibility
  /* eslint-disable @typescript-eslint/no-explicit-any */
  return (
    (<ConfigProvider>
      {(<ThemeProvider>
        {children as any}
      </ThemeProvider>) as any}
    </ConfigProvider>) as any
  );
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
