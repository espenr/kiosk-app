/**
 * Dedicated debug component for widget inspection
 * NOTE: Temporarily stubbed out during Chakra UI to Tailwind migration
 * TODO: Fully migrate this debug component when needed
 */

import { useWidgetRegistry } from './contexts/WidgetRegistryContext';
import { useLayout } from './contexts/LayoutContext';

/**
 * Debug component that renders debugging info directly on the page
 * STUB VERSION - Full functionality temporarily disabled
 */
export default function WidgetDebug() {
  const { widgetTypes, widgetInstances } = useWidgetRegistry();
  const { layoutConfig } = useLayout();

  return (
    <div className="fixed top-0 left-0 w-96 h-screen bg-gray-900 text-white p-4 overflow-y-auto z-50 opacity-90">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Widget Debug Panel</h3>
          <span className="text-xs text-gray-400">STUB VERSION</span>
        </div>

        <hr className="border-gray-700" />

        <div>
          <h4 className="text-sm font-semibold mb-2">Widget Types</h4>
          <p className="text-xs">Registered Types: {widgetTypes.size}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {Array.from(widgetTypes.keys()).map((type) => (
              <span key={type} className="text-xs bg-blue-600 px-2 py-1 rounded">
                {type}
              </span>
            ))}
          </div>
        </div>

        <hr className="border-gray-700" />

        <div>
          <h4 className="text-sm font-semibold mb-2">Widget Instances</h4>
          <p className="text-xs">Total Instances: {widgetInstances.size}</p>
          <div className="mt-2 space-y-1">
            {Array.from(widgetInstances.entries()).map(([id, widget]) => (
              <div key={id} className="text-xs p-2 bg-gray-800 rounded">
                <div className="font-mono">{id.substring(0, 12)}...</div>
                <div className="text-gray-400">Type: {widget.config.type}</div>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-gray-700" />

        <div>
          <h4 className="text-sm font-semibold mb-2">Layout</h4>
          <p className="text-xs">
            Grid: {layoutConfig.grid.columns} × {layoutConfig.grid.rows}
          </p>
          <p className="text-xs">Widgets: {layoutConfig.widgets.length}</p>
        </div>

        <div className="text-xs text-gray-500 mt-4">
          <p>⚠️ This is a stub version of the debug component.</p>
          <p className="mt-1">
            Full debugging functionality is temporarily disabled during the Chakra UI migration.
          </p>
        </div>
      </div>
    </div>
  );
}
