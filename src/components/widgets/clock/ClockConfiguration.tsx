import { ClockWidgetConfig } from '../../../types/widget';

interface ClockConfigurationProps {
  config: ClockWidgetConfig;
  onConfigChange: (newConfig: ClockWidgetConfig) => void;
}

export default function ClockConfiguration({
  config,
  onConfigChange,
}: ClockConfigurationProps) {
  // Helper function to update clock settings
  const updateSettings = (
    settingsUpdate: Partial<ClockWidgetConfig['clockSettings']>
  ) => {
    onConfigChange({
      ...config,
      clockSettings: {
        ...config.clockSettings,
        ...settingsUpdate,
      },
    });
  };

  // Function to test error logging
  const testErrorLogging = () => {
    console.log('Testing error logging system (DISABLED)');

    // Set a temporary ID that will trigger the test error
    onConfigChange({
      ...config,
      id: "test-error-logging"
    });

    // Reset the ID after 2 seconds
    setTimeout(() => {
      onConfigChange({
        ...config,
        id: config.id
      });
    }, 2000);
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Test error logging button */}
      <button
        className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors mb-2"
        onClick={testErrorLogging}
      >
        Test Error Logging
      </button>

      <div className="flex items-center justify-between">
        <label htmlFor="use24HourFormat" className="text-sm font-medium">
          Use 24-hour format
        </label>
        <input
          type="checkbox"
          id="use24HourFormat"
          className="w-10 h-5 rounded-full appearance-none cursor-pointer transition-colors duration-200
                     checked:bg-blue-600 bg-gray-300 relative
                     before:content-[''] before:absolute before:top-0.5 before:left-0.5
                     before:w-4 before:h-4 before:rounded-full before:bg-white before:transition-transform
                     checked:before:translate-x-5"
          checked={config.clockSettings.use24HourFormat}
          onChange={(e) => updateSettings({ use24HourFormat: e.target.checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <label htmlFor="showSeconds" className="text-sm font-medium">
          Show seconds
        </label>
        <input
          type="checkbox"
          id="showSeconds"
          className="w-10 h-5 rounded-full appearance-none cursor-pointer transition-colors duration-200
                     checked:bg-blue-600 bg-gray-300 relative
                     before:content-[''] before:absolute before:top-0.5 before:left-0.5
                     before:w-4 before:h-4 before:rounded-full before:bg-white before:transition-transform
                     checked:before:translate-x-5"
          checked={config.clockSettings.showSeconds}
          onChange={(e) => updateSettings({ showSeconds: e.target.checked })}
        />
      </div>

      <div className="flex items-center justify-between">
        <label htmlFor="showDate" className="text-sm font-medium">
          Show date
        </label>
        <input
          type="checkbox"
          id="showDate"
          className="w-10 h-5 rounded-full appearance-none cursor-pointer transition-colors duration-200
                     checked:bg-blue-600 bg-gray-300 relative
                     before:content-[''] before:absolute before:top-0.5 before:left-0.5
                     before:w-4 before:h-4 before:rounded-full before:bg-white before:transition-transform
                     checked:before:translate-x-5"
          checked={config.clockSettings.showDate}
          onChange={(e) => updateSettings({ showDate: e.target.checked })}
        />
      </div>

      {config.clockSettings.showDate && (
        <div className="flex flex-col space-y-2">
          <label htmlFor="dateFormat" className="text-sm font-medium">
            Date format
          </label>
          <select
            id="dateFormat"
            className="px-3 py-2 border border-gray-600 bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={config.clockSettings.dateFormat || 'full'}
            onChange={(e) => updateSettings({ dateFormat: e.target.value })}
          >
            <option value="full">Full (Tuesday, April 9, 2025)</option>
            <option value="long">Long (April 9, 2025)</option>
            <option value="medium">Medium (Apr 9, 2025)</option>
            <option value="short">Short (4/9/2025)</option>
          </select>
        </div>
      )}

      <div className="flex flex-col space-y-2">
        <label htmlFor="timezone" className="text-sm font-medium">
          Timezone
        </label>
        <select
          id="timezone"
          className="px-3 py-2 border border-gray-600 bg-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={config.clockSettings.timezone || ''}
          onChange={(e) => updateSettings({ timezone: e.target.value || undefined })}
        >
          <option value="">Local timezone</option>
          <option value="America/New_York">New York (EST/EDT)</option>
          <option value="America/Chicago">Chicago (CST/CDT)</option>
          <option value="America/Denver">Denver (MST/MDT)</option>
          <option value="America/Los_Angeles">Los Angeles (PST/PDT)</option>
          <option value="Europe/London">London (GMT/BST)</option>
          <option value="Europe/Paris">Paris (CET/CEST)</option>
          <option value="Europe/Stockholm">Stockholm (CET/CEST)</option>
          <option value="Asia/Tokyo">Tokyo (JST)</option>
          <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
        </select>
      </div>
    </div>
  );
}