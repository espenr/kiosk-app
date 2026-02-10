import { useEffect, useState } from 'react';
import React from 'react';
import Grid from './components/layout/Grid';
import GridItem from './components/layout/GridItem';
import ConfigPanel from './components/settings/ConfigPanel';
import WidgetRegistration from './components/widgets/WidgetRegistration';
import { useLayout } from './contexts/LayoutContext';
import { useWidgetRegistry } from './contexts/WidgetRegistryContext';
// Debug components temporarily disabled during Chakra UI migration
// import DebugLogger from './debug';
// import WidgetDebug from './widget-debug';

function App() {
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);

  return (
    <>
      {/* Register all widget types */}
      <WidgetRegistration />

      {/* Debug components temporarily disabled */}
      {/* <DebugLogger /> */}
      {/* <WidgetDebug /> */}

      {/* Main application */}
      <AppContent 
        isOpen={isOpen} 
        onOpen={onOpen} 
        onClose={onClose} 
      />
    </>
  );
}

// The main application content
function AppContent({ isOpen, onOpen, onClose }: { isOpen: boolean, onOpen: () => void, onClose: () => void }) {
  const { layoutConfig, updateLayoutConfig, updateWidgetPosition } = useLayout();
  const { createWidget, getWidget, updateWidget } = useWidgetRegistry();
  
  // Set up initial layout
  useEffect(() => {
    // Only set up default widgets if none exist yet
    if (layoutConfig.widgets.length === 0) {
      // logger.info('Initializing default layout', LogSource.APP);
      console.log('Initializing default layout');
      console.log('Available widget types for initialization:', Array.from(Object.keys(useWidgetRegistry().widgetTypes)));
      
      // Create the welcome widget
      updateLayoutConfig({
        ...layoutConfig,
        widgets: [
          {
            id: 'welcome',
            x: 3,
            y: 3,
            width: 6,
            height: 6,
            visible: true,
          },
        ],
      });
      
      // Create a clock widget and add it to layout
      // logger.info('Creating clock widget', LogSource.APP);
      console.log('Creating clock widget');
      
      // Debugging - check if clock widget type is registered
      const widgetRegistry = useWidgetRegistry();
      console.log('Widget registry state before creating clock:', {
        types: Array.from(widgetRegistry.widgetTypes.keys()),
        hasClockType: widgetRegistry.widgetTypes.has('clock'),
        metadata: widgetRegistry.getWidgetMetadata('clock'),
      });
      
      try {
        const clockWidgetId = createWidget('clock');
        // logger.info(`Created clock widget with ID: ${clockWidgetId}`, LogSource.APP);
        console.log(`Created clock widget with ID: ${clockWidgetId}`);
        console.log(`Created clock widget with ID: ${clockWidgetId}`);
        
        // Check if the widget was created successfully
        const createdWidget = widgetRegistry.getWidget(clockWidgetId);
        console.log('Created widget instance:', createdWidget);
        
        updateWidgetPosition({
          id: clockWidgetId,
          x: 0,
          y: 0,
          width: 4,
          height: 2,
          visible: true,
        });
        // logger.info('Updated widget position', LogSource.APP);
        console.log('Updated widget position');
        
        // Verify the layout was updated correctly
        console.log('Layout after adding clock widget:', layoutConfig);
      } catch (error) {
        console.error('Failed to create clock widget:', error);
      }
    } else {
      // Log existing layout for debugging
      console.log('Using existing layout:', layoutConfig);
      
      // Check if clock widget is in the layout but not in the registry
      const clockPositions = layoutConfig.widgets.filter(w => 
        w.id !== 'welcome' && (w.id.includes('clock') || w.id.includes('widget_'))
      );
      
      if (clockPositions.length > 0) {
        console.log('Found potential clock widgets in layout:', clockPositions);
        
        // Verify they exist in the registry
        clockPositions.forEach(pos => {
          const widget = getWidget(pos.id);
          console.log(`Widget ${pos.id} in registry:`, widget ? 'Yes' : 'No');
        });
      }
    }
  }, [layoutConfig, updateLayoutConfig, createWidget, updateWidgetPosition, getWidget]);

  return (
    <div className="w-full h-full">
      {/* Main Grid Layout */}
      <Grid>
        {layoutConfig.widgets.map((widgetPosition) => {
          const widgetInstance = widgetPosition.id !== 'welcome' 
            ? getWidget(widgetPosition.id)
            : null;

          // Enhanced debugging for widget rendering
          const hasInstance = !!widgetInstance;
          const widgetType = widgetInstance?.config.type || 'unknown';
          const componentExists = widgetInstance?.metadata?.component ? 'component exists' : 'no component';
          
          console.log(`Rendering widget [${widgetPosition.id}]:`, 
            hasInstance ? 'INSTANCE FOUND' : 'NO INSTANCE',
            `Type: ${widgetType}`, 
            componentExists,
            `Position: (${widgetPosition.x}, ${widgetPosition.y})`,
            `Size: ${widgetPosition.width}×${widgetPosition.height}`
          );
          
          if (widgetInstance) {
            console.log(`Widget config for ${widgetPosition.id}:`, widgetInstance.config);
            console.log(`Widget metadata for ${widgetPosition.id}:`, widgetInstance.metadata);
          }
          
          return (
            <GridItem key={widgetPosition.id} config={widgetPosition}>
              {widgetPosition.id === 'welcome' ? (
                <div className="h-full flex items-center justify-center">
                  <div className="flex flex-col items-center space-y-6">
                    <h1 className="text-4xl font-bold">Kiosk App</h1>
                    <p className="text-lg">Grid-based layout system is ready!</p>
                    <p className="text-gray-400">Task 2.1: Clock/Date Widget Implementation ✓</p>
                    <button
                      onClick={onOpen}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    >
                      Open Configuration
                    </button>
                  </div>
                </div>
              ) : widgetInstance ? (
                <div
                  className="h-full border border-white/20 relative"
                  style={{
                    backgroundColor: widgetInstance.config.appearance.backgroundColor || 'transparent',
                    color: widgetInstance.config.appearance.textColor || 'inherit',
                    borderRadius: widgetInstance.config.appearance.borderRadius ? `${widgetInstance.config.appearance.borderRadius}px` : undefined,
                    opacity: widgetInstance.config.appearance.opacity,
                  }}
                  data-widget-id={widgetPosition.id}
                  data-widget-type={widgetInstance.config.type}
                >
                  {/* Add key details for debugging */}
                  <div className="absolute top-0 right-0 text-xs p-1 bg-black/70 text-white rounded-sm z-[5]">
                    {widgetInstance.config.type} [{widgetPosition.id.substring(0, 6)}]
                  </div>
                  
                  {/* Render the widget component */}
                  {(() => {
                    try {
                      // Extra logging for component rendering
                      console.log(`Rendering ${widgetPosition.id} with component:`, {
                        component: widgetInstance.metadata.component,
                        config: widgetInstance.config,
                      });
                      
                      return React.createElement(widgetInstance.metadata.component, {
                        config: widgetInstance.config,
                        onConfigChange: (newConfig) => updateWidget(widgetPosition.id, newConfig),
                      });
                    } catch (error) {
                      const errorMessage = error instanceof Error ? error.message : String(error);
                      console.error(`Error rendering widget ${widgetPosition.id}:`, error);
                      
                      // Logger disabled to prevent log flooding
                      // logger.error(
                      //   `Error rendering widget ${widgetPosition.id}: ${errorMessage}`,
                      //   LogSource.WIDGET,
                      //   {
                      //     widgetId: widgetPosition.id,
                      //     widgetType: widgetInstance.config.type,
                      //     componentName: 'WidgetRenderer'
                      //   },
                      //   error instanceof Error ? error : new Error(errorMessage)
                      // );
                      
                      return (
                        <div className="p-2 bg-red-700 text-white">
                          <div>Widget Error: {errorMessage}</div>
                          <div className="text-xs mt-2">Check console for details</div>
                        </div>
                      );
                    }
                  })()}
                </div>
              ) : (
                <div className="p-2 bg-yellow-700 text-white h-full" id={`missing-widget-${widgetPosition.id}`}>
                  <h3 className="text-sm font-semibold mb-2">Widget Missing</h3>
                  <div>Widget ID: {widgetPosition.id}</div>
                  <div>Position: ({widgetPosition.x}, {widgetPosition.y})</div>
                  <div>Type: {widgetPosition.id.includes('clock') ? 'clock (likely)' : 'unknown'}</div>
                  <div className="text-xs mt-2">Instance not found in widget registry</div>
                  <button
                    className="text-xs mt-3 px-2 py-1 bg-orange-600 hover:bg-orange-700 rounded transition-colors"
                    onClick={() => {
                      console.log('Widget registry map:', Array.from(useWidgetRegistry().widgetInstances.entries()));
                      console.log('Widget types:', Array.from(useWidgetRegistry().widgetTypes.entries()));
                    }}
                  >
                    Debug Registry
                  </button>
                </div>
              )}
            </GridItem>
          );
        })}
      </Grid>

      {/* Configuration Panel */}
      <ConfigPanel isOpen={isOpen} onClose={onClose} />
      
      {/* Settings Button (Visible when panel is closed) */}
      {!isOpen && (
        <button
          aria-label="Settings"
          className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-gray-700 hover:bg-gray-600 flex items-center justify-center text-2xl opacity-70 hover:opacity-100 transition-all"
          onClick={onOpen}
        >
          ⚙️
        </button>
      )}
    </div>
  );
}

export default App;
