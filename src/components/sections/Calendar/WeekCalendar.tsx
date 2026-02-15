import { useCalendar } from '../../../hooks/useCalendar';
import { getEventsForDay, formatEventTime, CalendarEvent } from '../../../services/calendar';

/**
 * Week calendar showing 7 days with events from multiple family calendars
 * Each family member has their own color and optional icon
 */
export function WeekCalendar() {
  const { events, isLoading, error, isConfigured } = useCalendar();

  // Generate 7 days starting from today
  const days = getWeekDays();

  // Not configured state
  if (!isConfigured) {
    return (
      <div className="h-full w-full p-4 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Kalender ikke konfigurert</p>
      </div>
    );
  }

  // Loading state (only on initial load)
  if (isLoading && events.length === 0) {
    return (
      <div className="h-full w-full p-4 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Laster kalender...</p>
      </div>
    );
  }

  // Error state (only show if no cached data)
  if (error && events.length === 0) {
    return (
      <div className="h-full w-full p-4 flex items-center justify-center">
        <p className="text-red-400 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full px-2 py-1 flex flex-col">
      <div className="grid grid-cols-7 gap-1 flex-1 min-h-0">
        {days.map((day) => (
          <DayColumn
            key={day.date.toISOString()}
            day={day}
            events={getEventsForDay(events, day.date)}
          />
        ))}
      </div>
    </div>
  );
}

interface DayInfo {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
}

function getWeekDays(): DayInfo[] {
  const dayNames = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: DayInfo[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    days.push({
      date,
      dayName: dayNames[date.getDay()],
      dayNumber: date.getDate(),
      isToday: i === 0,
    });
  }

  return days;
}

interface DayColumnProps {
  day: DayInfo;
  events: CalendarEvent[];
}

function DayColumn({ day, events }: DayColumnProps) {
  return (
    <div className="flex flex-col min-h-0">
      {/* Day header - compact */}
      <div
        className={`text-center pb-1 border-b border-gray-600/50 ${
          day.isToday ? 'bg-blue-900/40 rounded-t' : ''
        }`}
      >
        <div
          className={`text-xs font-medium ${
            day.isToday ? 'text-blue-400' : 'text-gray-500'
          }`}
        >
          {day.dayName}
        </div>
        <div
          className={`text-sm font-bold ${
            day.isToday ? 'text-blue-300' : 'text-gray-300'
          }`}
        >
          {day.dayNumber}
        </div>
      </div>

      {/* Events list - compact */}
      <div className="flex-1 pt-1 overflow-y-auto space-y-0.5">
        {events.length === 0 ? (
          <div className="text-[10px] text-gray-600 text-center">-</div>
        ) : (
          events.map((event) => <EventItem key={event.id} event={event} />)
        )}
      </div>
    </div>
  );
}

interface EventItemProps {
  event: CalendarEvent;
}

function EventItem({ event }: EventItemProps) {
  // Use the calendar's color (set per family member)
  const color = event.calendarColor;

  return (
    <div
      className="text-[10px] leading-tight px-1 py-0.5 rounded truncate"
      style={{
        backgroundColor: `${color}30`,
        borderLeft: `2px solid ${color}`,
      }}
      title={`${event.calendarName}: ${event.title}`}
    >
      {/* Icon (emoji) for family member */}
      {event.calendarIcon && (
        <span className="mr-0.5 text-[9px]">{event.calendarIcon}</span>
      )}
      {/* Time for non-all-day events */}
      {!event.isAllDay && (
        <span className="text-gray-400">{formatEventTime(event.start)} </span>
      )}
      {/* Event title - truncated */}
      <span className="text-gray-200">{event.title}</span>
    </div>
  );
}
