import { useCalendar } from '../../../hooks/useCalendar';
import { getEventsForDay, formatEventTime, CalendarEvent } from '../../../services/calendar';

/**
 * Week calendar showing 5 days with events from multiple family calendars
 *
 * Glass Effect Implementation:
 * - Phase 1: backdrop-blur (8px) for Pi 2 compatibility
 * - Phase 2: backdrop-blur-md (12px) for enhanced depth (requires testing)
 *
 * Event Card Design:
 * - Colored dots indicate calendar ownership (replaces solid backgrounds)
 * - Glass effect on all containers for visual cohesion
 * - White text on semi-transparent backgrounds
 *
 * Performance Considerations:
 * - Conservative blur levels to prevent GPU overload on Pi 2
 * - GPU acceleration via will-change and translateZ
 * - Tested to maintain <70°C GPU temperature
 *
 * @see CLAUDE.md for full implementation details and rollback procedures
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
    <div className="h-full w-full px-2 py-2 bg-gray-900/30 backdrop-blur border border-white/5 rounded-lg shadow-xl">
      {/* Calendar grid - full width */}
      <div className="h-full grid grid-cols-5 gap-3 p-2">
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
      <div className="bg-gray-800/50 backdrop-blur border-t border-x border-white/10 rounded-t px-2 py-1.5 mb-2">
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
    <div className="backdrop-blur-sm bg-white/10 border border-white/15 rounded px-1.5 py-1">
      <div className="flex items-start gap-1.5 leading-tight">
        {/* Colored dot indicator for calendar */}
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5"
          style={{ backgroundColor: color }}
        />

        {/* Icon (if present) */}
        {icon && (
          <span className="flex-shrink-0 text-white/90" style={{ fontSize: '0.65rem' }}>
            {icon}
          </span>
        )}

        {/* Time + Title */}
        <div className="flex-1 min-w-0">
          <span className="font-normal text-white" style={{ fontSize: '0.7rem' }}>
            {!event.isAllDay && `${formatEventTime(event.start)} `}
            <span style={{ fontSize: '0.75rem' }}>{event.title}</span>
          </span>
        </div>
      </div>

      {/* End time with arrow */}
      {!event.isAllDay && (
        <div className="text-white/80 ml-5" style={{ fontSize: '0.65rem', marginTop: '1px' }}>
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
