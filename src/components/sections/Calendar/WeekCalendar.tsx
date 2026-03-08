import { useCalendar } from '../../../hooks/useCalendar';
import { getEventsForDay, formatEventTime, CalendarEvent } from '../../../services/calendar';

/**
 * Week calendar showing 7 days with events from multiple family calendars
 * New design: Month on left, dates across top, compact event cards
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
    <div className="h-full w-full px-2 py-2">
      {/* Calendar grid - full width */}
      <div className="h-full grid grid-cols-5 gap-3">
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
  for (let i = 0; i < 5; i++) {
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
  // Sort events: all-day events first, then by start time
  const sortedEvents = [...events].sort((a, b) => {
    // All-day events always come first
    if (a.isAllDay && !b.isAllDay) return -1;
    if (!a.isAllDay && b.isAllDay) return 1;

    // Both all-day or both timed: sort by start time
    return a.start.getTime() - b.start.getTime();
  });

  return (
    <div className="flex flex-col min-h-0">
      {/* Day header with backdrop */}
      <div className="bg-gray-800/60 backdrop-blur-sm rounded-t px-2 py-1.5 mb-2">
        {/* Day name */}
        <div className="text-center mb-0.5">
          <div className="text-white font-normal" style={{ fontSize: '1.3rem' }}>
            {day.dayName}
          </div>
        </div>

        {/* Date number */}
        <div className="text-center flex justify-center">
          <span className="text-gray-300 font-light" style={{ fontSize: '2.2rem', lineHeight: '1' }}>
            {day.dayNumber}
          </span>
        </div>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto space-y-1 px-0.5">
        {sortedEvents.map((event) => (
          <EventItem key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

interface EventItemProps {
  event: CalendarEvent;
}

function EventItem({ event }: EventItemProps) {
  const color = event.calendarColor;
  const icon = getCalendarIcon(event.calendarIcon);

  return (
    <div
      className="px-1.5 py-1 rounded"
      style={{
        backgroundColor: color,
        opacity: 0.8,  // 20% transparent = 80% opacity
      }}
    >
      {/* Icon + Time + Title on same line */}
      <div className="flex items-start gap-1 text-black leading-tight">
        {icon && (
          <span className="flex-shrink-0" style={{ fontSize: '0.65rem' }}>
            {icon}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <span className="font-normal" style={{ fontSize: '0.7rem' }}>
            {!event.isAllDay && `${formatEventTime(event.start)} `}
            <span style={{ fontSize: '0.75rem' }}>{event.title}</span>
          </span>
        </div>
      </div>

      {/* End time with arrow */}
      {!event.isAllDay && (
        <div className="text-black ml-4" style={{ fontSize: '0.65rem', opacity: 0.85, marginTop: '1px' }}>
          → {formatEventTime(event.end)}
        </div>
      )}
    </div>
  );
}

/**
 * Map calendar icon identifier to emoji
 * Common patterns: person, trophy, family, etc.
 */
function getCalendarIcon(iconName?: string): string | null {
  if (!iconName) return null;

  const iconMap: Record<string, string> = {
    person: '👤',
    user: '👤',
    profile: '👤',
    trophy: '🏆',
    award: '🏆',
    family: '👨‍👩‍👧‍👦',
    home: '🏠',
    work: '💼',
    school: '🎓',
    sports: '⚽',
    music: '🎵',
    food: '🍽️',
    medical: '⚕️',
  };

  return iconMap[iconName.toLowerCase()] || '📅';
}
