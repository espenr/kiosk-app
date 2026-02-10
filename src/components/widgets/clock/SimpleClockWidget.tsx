import SimpleClockDisplay from './SimpleClockDisplay';

/**
 * A simplified version of the ClockWidget component for debugging
 */
export default function SimpleClockWidget() {
  console.log('SimpleClockWidget rendering');

  return (
    <div className="border border-white/20 rounded-md p-4 bg-gray-700 w-[300px]">
      <h3 className="text-lg font-semibold mb-2">Simple Clock Widget</h3>
      <SimpleClockDisplay />
    </div>
  );
}