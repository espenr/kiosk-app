import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { 
  WidgetCapabilities, 
  WidgetConfig, 
  WidgetInstance, 
  WidgetMetadata, 
  WidgetType 
} from '../types/widget';
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '../utils/storage';

// Default widget capabilities
const DEFAULT_CAPABILITIES: WidgetCapabilities = {
  resizable: true,
  movable: true,
  configurable: true,
  refreshable: false,
};

// Context interface
interface WidgetRegistryContextType {
  // Widget type registry
  widgetTypes: Map<WidgetType, WidgetMetadata>;
  registerWidgetType: (metadata: WidgetMetadata) => void;
  unregisterWidgetType: (type: WidgetType) => void;
  getWidgetMetadata: (type: WidgetType) => WidgetMetadata | undefined;
  
  // Widget instances
  widgetInstances: Map<string, WidgetInstance>;
  createWidget: (type: WidgetType, initialConfig?: Partial<WidgetConfig>) => string;
  updateWidget: (id: string, configUpdate: Partial<WidgetConfig>) => void;
  deleteWidget: (id: string) => void;
  getWidget: (id: string) => WidgetInstance | undefined;
  
  // Widget capabilities
  setWidgetCapabilities: (type: WidgetType, capabilities: Partial<WidgetCapabilities>) => void;
  getWidgetCapabilities: (type: WidgetType) => WidgetCapabilities;
  
  // Widget data
  getWidgetsByType: (type: WidgetType) => WidgetInstance[];
  getAllWidgets: () => WidgetInstance[];
}

// Create context with default empty values
const WidgetRegistryContext = createContext<WidgetRegistryContextType>({
  widgetTypes: new Map(),
  registerWidgetType: () => {},
  unregisterWidgetType: () => {},
  getWidgetMetadata: () => undefined,
  
  widgetInstances: new Map(),
  createWidget: () => '',
  updateWidget: () => {},
  deleteWidget: () => {},
  getWidget: () => undefined,
  
  setWidgetCapabilities: () => {},
  getWidgetCapabilities: () => DEFAULT_CAPABILITIES,
  
  getWidgetsByType: () => [],
  getAllWidgets: () => [],
});

// Generate a unique ID for widgets
function generateWidgetId(): string {
  return `widget_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

// Provider component
export function WidgetRegistryProvider({ children }: { children: ReactNode }) {
  // Widget type registry
  const [widgetTypes, setWidgetTypes] = useState<Map<WidgetType, WidgetMetadata>>(new Map());
  
  // Widget capabilities by type
  const [widgetCapabilities, setWidgetCapabilities] = useState<Map<WidgetType, WidgetCapabilities>>(new Map());
  
  // Widget instances
  const [widgetInstances, setWidgetInstances] = useState<Map<string, WidgetInstance>>(() => {
    // We'll populate this map after widget types are registered
    return new Map<string, WidgetInstance>();
  });

  // Register a widget type
  const registerWidgetType = (metadata: WidgetMetadata) => {
    setWidgetTypes(prev => {
      const updated = new Map(prev);
      updated.set(metadata.type, metadata);
      return updated;
    });
    
    // Set default capabilities if not already set
    if (!widgetCapabilities.has(metadata.type)) {
      setWidgetCapabilities(prev => {
        const updated = new Map(prev);
        updated.set(metadata.type, DEFAULT_CAPABILITIES);
        return updated;
      });
    }
  };

  // Unregister a widget type
  const unregisterWidgetType = (type: WidgetType) => {
    setWidgetTypes(prev => {
      const updated = new Map(prev);
      updated.delete(type);
      return updated;
    });
    
    setWidgetCapabilities(prev => {
      const updated = new Map(prev);
      updated.delete(type);
      return updated;
    });
  };

  // Get metadata for a widget type
  const getWidgetMetadata = (type: WidgetType): WidgetMetadata | undefined => {
    return widgetTypes.get(type);
  };

  // Create a new widget instance
  const createWidget = (type: WidgetType, initialConfig?: Partial<WidgetConfig>): string => {
    const metadata = widgetTypes.get(type);
    if (!metadata) {
      throw new Error(`Widget type "${type}" not registered`);
    }
    
    const id = generateWidgetId();
    // Clone the default config and ensure type safety
    const defaultConfig = { ...metadata.defaultConfig };
    
    // Create the widget config by merging defaults with initial config
    // We need to cast here because TypeScript can't infer the relationship
    // between the type parameter and defaultConfig
    const config = {
      ...defaultConfig,
      ...initialConfig,
      id,
      // Ensure the type property matches the requested type
      type,
    } as WidgetConfig;
    
    // Create the widget instance
    const instance: WidgetInstance = {
      config,
      metadata,
      capabilities: widgetCapabilities.get(type) || DEFAULT_CAPABILITIES,
      isLoading: false,
      error: null,
    };
    
    // Update widget instances
    setWidgetInstances(prev => {
      const updated = new Map(prev);
      updated.set(id, instance);
      return updated;
    });
    
    return id;
  };

  // Update a widget instance
  const updateWidget = (id: string, configUpdate: Partial<WidgetConfig>) => {
    setWidgetInstances(prev => {
      const instance = prev.get(id);
      if (!instance) return prev;
      
      // Create a type-safe updated config by ensuring the type property doesn't change
      const updatedConfig = {
        ...instance.config,
        ...configUpdate,
        // Always preserve the original type to maintain type safety
        type: instance.config.type,
      };
      
      const updated = new Map(prev);
      updated.set(id, {
        ...instance,
        config: updatedConfig as WidgetConfig,
      });
      return updated;
    });
  };

  // Delete a widget instance
  const deleteWidget = (id: string) => {
    setWidgetInstances(prev => {
      const updated = new Map(prev);
      updated.delete(id);
      return updated;
    });
  };

  // Get a widget instance
  const getWidget = (id: string): WidgetInstance | undefined => {
    return widgetInstances.get(id);
  };

  // Set capabilities for a widget type
  const setWidgetTypeCapabilities = (type: WidgetType, capabilities: Partial<WidgetCapabilities>) => {
    setWidgetCapabilities(prev => {
      const current = prev.get(type) || DEFAULT_CAPABILITIES;
      const updated = new Map(prev);
      updated.set(type, {
        ...current,
        ...capabilities,
      });
      return updated;
    });
  };

  // Get capabilities for a widget type
  const getWidgetTypeCapabilities = (type: WidgetType): WidgetCapabilities => {
    return widgetCapabilities.get(type) || DEFAULT_CAPABILITIES;
  };

  // Get all widget instances of a specific type
  const getWidgetsByType = (type: WidgetType): WidgetInstance[] => {
    return Array.from(widgetInstances.values()).filter(widget => widget.config.type === type);
  };

  // Get all widget instances
  const getAllWidgets = (): WidgetInstance[] => {
    return Array.from(widgetInstances.values());
  };

  // Save widget configurations when they change
  useEffect(() => {
    const widgetConfigs = Array.from(widgetInstances.values()).map(instance => instance.config);
    saveToStorage(STORAGE_KEYS.WIDGETS, widgetConfigs);
  }, [widgetInstances]);

  // Initialize widget instances from saved configurations once widget types are registered
  useEffect(() => {
    if (widgetTypes.size > 0) {
      const savedWidgets = loadFromStorage<WidgetConfig[]>(STORAGE_KEYS.WIDGETS, []);
      const instances = new Map<string, WidgetInstance>();
      
      // Create instances for saved widgets if their types are registered
      savedWidgets.forEach(config => {
        const metadata = widgetTypes.get(config.type);
        if (metadata) {
          const capabilities = widgetCapabilities.get(config.type) || DEFAULT_CAPABILITIES;
          instances.set(config.id, {
            config,
            metadata,
            capabilities,
            isLoading: false,
            error: null,
          });
        }
      });
      
      setWidgetInstances(instances);
    }
  }, [widgetTypes, widgetCapabilities]);

  return (
    <WidgetRegistryContext.Provider
      value={{
        widgetTypes,
        registerWidgetType,
        unregisterWidgetType,
        getWidgetMetadata,
        
        widgetInstances,
        createWidget,
        updateWidget,
        deleteWidget,
        getWidget,
        
        setWidgetCapabilities: setWidgetTypeCapabilities,
        getWidgetCapabilities: getWidgetTypeCapabilities,
        
        getWidgetsByType,
        getAllWidgets,
      }}
    >
      {children}
    </WidgetRegistryContext.Provider>
  );
}

// Custom hook to use the widget registry context
export const useWidgetRegistry = () => useContext(WidgetRegistryContext);