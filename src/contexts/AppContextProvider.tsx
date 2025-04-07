import { ReactNode } from 'react';
import { AppSettingsProvider } from './AppSettingsContext';
import { LayoutProvider } from './LayoutContext';
import { ThemeProvider } from './ThemeContext';
import { WidgetRegistryProvider } from './WidgetRegistryContext';

/**
 * Central context provider that combines all application contexts
 * This establishes the context hierarchy and ensures proper nesting order
 */
export function AppContextProvider({ children }: { children: ReactNode }) {
  return (
    <AppSettingsProvider>
      <ThemeProvider>
        <WidgetRegistryProvider>
          <LayoutProvider>
            {children}
          </LayoutProvider>
        </WidgetRegistryProvider>
      </ThemeProvider>
    </AppSettingsProvider>
  );
}