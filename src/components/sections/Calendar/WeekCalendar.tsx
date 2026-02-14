/**
 * Week calendar showing 7 days with events from Google Calendar
 * Placeholder - will be implemented in Phase 5
 */
export function WeekCalendar() {
  const days = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

  return (
    <div className="h-full w-full p-4">
      <h2 className="text-lg font-semibold mb-3 text-gray-300">Ukekalender</h2>
      <div className="grid grid-cols-7 gap-2 h-[calc(100%-2.5rem)]">
        {days.map((day) => (
          <div key={day} className="flex flex-col">
            <div className="text-center text-sm font-medium text-gray-400 pb-2 border-b border-gray-700">
              {day}
            </div>
            <div className="flex-1 pt-2 text-xs text-gray-500">
              {/* Events will go here */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
