/**
 * Debug helper to log key application state
 * Import this file in App.tsx to use it
 */

import { useEffect } from 'react';
import { useWidgetRegistry } from './contexts/WidgetRegistryContext';
import { useLayout } from './contexts/LayoutContext';

export default function DebugLogger() {
  const { widgetTypes, widgetInstances, getAllWidgets, getWidgetsByType } = useWidgetRegistry();
  const { layoutConfig } = useLayout();

  useEffect(() => {
    console.log('%c===== DEBUG APP STATE =====', 'font-weight: bold; color: blue;');
    
    // Log registered widget types
    console.log('%cRegistered Widget Types:', 'font-weight: bold;', Array.from(widgetTypes.keys()));
    console.log('Widget Types Map Content:', widgetTypes);
    
    // Log widget instances
    console.log('%cWidget Instances:', 'font-weight: bold;', Array.from(widgetInstances.entries()));
    
    // Log all widgets
    console.log('%cAll Widgets:', 'font-weight: bold;', getAllWidgets());
    
    // Log clock widgets specifically
    console.log('%cClock Widgets:', 'font-weight: bold;', getWidgetsByType('clock'));
    
    // Log layout configuration
    console.log('%cLayout Config:', 'font-weight: bold;', layoutConfig);
    console.log('Widget positions in layout:', layoutConfig.widgets);
    
    // Print a warning if we have layout positions but no widget instances
    if (layoutConfig.widgets.length > 0 && widgetInstances.size === 0) {
      console.warn('Warning: Layout has widget positions but no widget instances are registered');
    }
    
    // Print a warning if clock widget type isn't registered
    if (!widgetTypes.has('clock')) {
      console.error('Error: Clock widget type is not registered!');
    }
    
    console.log('%c===== END DEBUG =====', 'font-weight: bold; color: blue;');
  }, [widgetTypes, widgetInstances, getAllWidgets, getWidgetsByType, layoutConfig]);

  return null;
}