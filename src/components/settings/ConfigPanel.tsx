import { useState } from 'react';
import { useLayout } from '../../contexts/LayoutContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useWidgetRegistry } from '../../contexts/WidgetRegistryContext';
import { ClockConfiguration } from '../../components/widgets/clock';

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConfigPanel({ isOpen, onClose }: ConfigPanelProps) {
  const { layoutConfig, updateLayoutConfig } = useLayout();
  const { themeConfig, updateThemeConfig, toggleColorMode, toggleHighContrast } = useTheme();
  const { getWidgetsByType, updateWidget } = useWidgetRegistry();
  const [activeTab, setActiveTab] = useState(0);

  // Update grid columns
  const handleColumnsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const columns = parseInt(e.target.value);
    if (!isNaN(columns) && columns > 0) {
      updateLayoutConfig({
        ...layoutConfig,
        grid: {
          ...layoutConfig.grid,
          columns,
        },
      });
    }
  };

  // Update grid rows
  const handleRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rows = parseInt(e.target.value);
    if (!isNaN(rows) && rows > 0) {
      updateLayoutConfig({
        ...layoutConfig,
        grid: {
          ...layoutConfig.grid,
          rows,
        },
      });
    }
  };

  // Update font size
  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fontSize = parseInt(e.target.value);
    if (!isNaN(fontSize) && fontSize > 0) {
      updateThemeConfig({
        fontSizeBase: fontSize,
      });
    }
  };

  // Update primary color
  const handlePrimaryColorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateThemeConfig({
      primaryColor: e.target.value,
    });
  };

  // Update accent color
  const handleAccentColorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateThemeConfig({
      accentColor: e.target.value,
    });
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-300 z-40 ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-gray-800 shadow-xl transform transition-transform duration-300 ease-out z-50 flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold">Configuration</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700">
          <div className="flex space-x-1 p-2">
            {['Layout', 'Theme', 'Widgets'].map((tab, index) => (
              <button
                key={tab}
                onClick={() => setActiveTab(index)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === index
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Layout Tab */}
          {activeTab === 0 && (
            <div className="flex flex-col space-y-5">
              <div className="text-sm font-medium">Grid Configuration</div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label htmlFor="columns" className="block text-sm font-medium mb-2">
                    Columns
                  </label>
                  <input
                    type="number"
                    id="columns"
                    min="1"
                    max="24"
                    value={layoutConfig.grid.columns}
                    onChange={handleColumnsChange}
                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="rows" className="block text-sm font-medium mb-2">
                    Rows
                  </label>
                  <input
                    type="number"
                    id="rows"
                    min="1"
                    max="24"
                    value={layoutConfig.grid.rows}
                    onChange={handleRowsChange}
                    className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4">
                <div className="text-sm font-medium mb-2">Current Layout:</div>
                <div className="text-sm text-gray-400">
                  Grid: {layoutConfig.grid.columns} × {layoutConfig.grid.rows}
                </div>
                <div className="text-sm text-gray-400">
                  Widgets: {layoutConfig.widgets.length}
                </div>
              </div>
            </div>
          )}

          {/* Theme Tab */}
          {activeTab === 1 && (
            <div className="flex flex-col space-y-5">
              <div className="flex items-center justify-between">
                <label htmlFor="dark-mode" className="text-sm font-medium">
                  Dark Mode
                </label>
                <input
                  type="checkbox"
                  id="dark-mode"
                  className="w-10 h-5 rounded-full appearance-none cursor-pointer transition-colors duration-200
                             checked:bg-blue-600 bg-gray-300 relative
                             before:content-[''] before:absolute before:top-0.5 before:left-0.5
                             before:w-4 before:h-4 before:rounded-full before:bg-white before:transition-transform
                             checked:before:translate-x-5"
                  checked={themeConfig.colorMode === 'dark'}
                  onChange={toggleColorMode}
                />
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="high-contrast" className="text-sm font-medium">
                  High Contrast
                </label>
                <input
                  type="checkbox"
                  id="high-contrast"
                  className="w-10 h-5 rounded-full appearance-none cursor-pointer transition-colors duration-200
                             checked:bg-blue-600 bg-gray-300 relative
                             before:content-[''] before:absolute before:top-0.5 before:left-0.5
                             before:w-4 before:h-4 before:rounded-full before:bg-white before:transition-transform
                             checked:before:translate-x-5"
                  checked={themeConfig.highContrast}
                  onChange={toggleHighContrast}
                />
              </div>

              <div>
                <label htmlFor="font-size" className="block text-sm font-medium mb-2">
                  Base Font Size
                </label>
                <input
                  type="number"
                  id="font-size"
                  min="8"
                  max="32"
                  value={themeConfig.fontSizeBase}
                  onChange={handleFontSizeChange}
                  className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="primary-color" className="block text-sm font-medium mb-2">
                  Primary Color
                </label>
                <select
                  id="primary-color"
                  value={themeConfig.primaryColor}
                  onChange={handlePrimaryColorChange}
                  className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="blue.500">Blue</option>
                  <option value="teal.500">Teal</option>
                  <option value="green.500">Green</option>
                  <option value="purple.500">Purple</option>
                  <option value="red.500">Red</option>
                  <option value="orange.500">Orange</option>
                </select>
              </div>

              <div>
                <label htmlFor="accent-color" className="block text-sm font-medium mb-2">
                  Accent Color
                </label>
                <select
                  id="accent-color"
                  value={themeConfig.accentColor}
                  onChange={handleAccentColorChange}
                  className="w-full px-3 py-2 border border-gray-600 bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="blue.400">Blue</option>
                  <option value="teal.400">Teal</option>
                  <option value="green.400">Green</option>
                  <option value="purple.400">Purple</option>
                  <option value="red.400">Red</option>
                  <option value="orange.400">Orange</option>
                </select>
              </div>
            </div>
          )}

          {/* Widgets Tab */}
          {activeTab === 2 && (
            <div className="flex flex-col space-y-5">
              <div className="text-lg font-bold">Clock Widget</div>
              {getWidgetsByType('clock').map(widget => (
                <div key={widget.config.id} className="p-4 border border-gray-700 rounded-md">
                  <div className="text-md mb-3">{widget.config.title}</div>
                  <ClockConfiguration
                    config={widget.config as import('../../../src/types/widget').ClockWidgetConfig}
                    onConfigChange={(newConfig) => updateWidget(widget.config.id, newConfig)}
                  />
                </div>
              ))}
              {getWidgetsByType('clock').length === 0 && (
                <div className="text-gray-500">No clock widgets found.</div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-600 hover:border-gray-500 text-white rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}
