import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '../utils/storage';

// Grid size configuration
export interface GridConfig {
  columns: number;
  rows: number;
}

// Widget position and size
export interface WidgetPosition {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

// Layout configuration
export interface LayoutConfig {
  grid: GridConfig;
  widgets: WidgetPosition[];
}

// Default layout configuration
const defaultLayoutConfig: LayoutConfig = {
  grid: {
    columns: 12,
    rows: 12,
  },
  widgets: [],
};

// Context interface
interface LayoutContextType {
  layoutConfig: LayoutConfig;
  updateLayoutConfig: (config: LayoutConfig) => void;
  updateWidgetPosition: (widgetPosition: WidgetPosition) => void;
}

// Create context with default values
const LayoutContext = createContext<LayoutContextType>({
  layoutConfig: defaultLayoutConfig,
  updateLayoutConfig: () => {},
  updateWidgetPosition: () => {},
});

// Layout provider component
export function LayoutProvider({ children }: { children: ReactNode }) {
  const [layoutConfig, setLayoutConfig] = useState<LayoutConfig>(() => 
    loadFromStorage(STORAGE_KEYS.LAYOUT_CONFIG, defaultLayoutConfig)
  );

  // Save to local storage when config changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.LAYOUT_CONFIG, layoutConfig);
  }, [layoutConfig]);

  // Update entire layout configuration
  const updateLayoutConfig = (config: LayoutConfig) => {
    setLayoutConfig(config);
  };

  // Update a single widget position
  const updateWidgetPosition = (widgetPosition: WidgetPosition) => {
    setLayoutConfig((prevConfig) => {
      const widgetIndex = prevConfig.widgets.findIndex((w) => w.id === widgetPosition.id);
      const updatedWidgets = [...prevConfig.widgets];

      if (widgetIndex >= 0) {
        updatedWidgets[widgetIndex] = widgetPosition;
      } else {
        updatedWidgets.push(widgetPosition);
      }

      return {
        ...prevConfig,
        widgets: updatedWidgets,
      };
    });
  };

  return (
    <LayoutContext.Provider value={{ layoutConfig, updateLayoutConfig, updateWidgetPosition }}>
      {children}
    </LayoutContext.Provider>
  );
}

// Custom hook to use the layout context
export const useLayout = () => useContext(LayoutContext);