/**
 * Debug app for testing just the Clock Widget
 */

import SimpleClockWidget from './components/widgets/clock/SimpleClockWidget';

function DebugClockApp() {
  return (
    <div className="w-full h-screen bg-gray-800 text-white p-8">
      <div className="flex flex-col items-center space-y-8">
        <h1 className="text-3xl font-bold">Clock Widget Debug</h1>

        <div className="w-full flex justify-center">
          <SimpleClockWidget />
        </div>
      </div>
    </div>
  );
}

export default DebugClockApp;