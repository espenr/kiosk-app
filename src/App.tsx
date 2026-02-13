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
    if (layoutConfig.widgets.length === 0) {
      console.log('Initializing default layout');

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

      try {
        const clockWidgetId = createWidget('clock');
        console.log(`Created clock widget with ID: ${clockWidgetId}`);

        updateWidgetPosition({
          id: clockWidgetId,
          x: 0,
          y: 0,
          width: 4,
          height: 2,
          visible: true,
        });
      } catch (error) {
        console.error('Failed to create clock widget:', error);
      }
    }
  }, [layoutConfig, updateLayoutConfig, createWidget, updateWidgetPosition]);

  return (
    <div className="w-full h-full">
      {/* Main Grid Layout */}
      <Grid>
        {layoutConfig.widgets.map((widgetPosition) => {
          const widgetInstance = widgetPosition.id !== 'welcome'
            ? getWidget(widgetPosition.id)
            : null;

          return (
            <GridItem key={widgetPosition.id} config={widgetPosition}>
              {widgetPosition.id === 'welcome' ? (
                <div className="h-full flex items-center justify-center">
                  <div className="flex flex-col items-center space-y-6">
                    <h1 className="text-4xl font-bold">Kiosk App</h1>
                    <p className="text-lg">Grid-based layout system is ready!</p>
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
                  className="h-full relative"
                  style={{
                    backgroundColor: widgetInstance.config.appearance.backgroundColor || 'transparent',
                    color: widgetInstance.config.appearance.textColor || 'inherit',
                    borderRadius: widgetInstance.config.appearance.borderRadius ? `${widgetInstance.config.appearance.borderRadius}px` : undefined,
                    opacity: widgetInstance.config.appearance.opacity,
                  }}
                >
                  {React.createElement(widgetInstance.metadata.component, {
                    config: widgetInstance.config,
                    onConfigChange: (newConfig) => updateWidget(widgetPosition.id, newConfig),
                  })}
                </div>
              ) : (
                <div className="p-2 bg-yellow-700 text-white h-full">
                  <div className="text-sm font-semibold">Widget not found</div>
                  <div className="text-xs mt-1">{widgetPosition.id}</div>
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
