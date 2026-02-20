/**
 * Calendar service - Fetches calendar events from backend API
 *
 * The backend handles OAuth token refresh and Google Calendar API calls,
 * keeping sensitive credentials server-side.
 */

const BACKEND_API = import.meta.env.DEV ? 'http://localhost:3001' : '';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay: boolean;
  // Calendar source info for styling
  calendarId: string;
  calendarName: string;
  calendarColor: string;
  calendarIcon?: string;
}

export interface CalendarData {
  events: CalendarEvent[];
  fetchedAt: Date;
}

interface BackendCalendarEvent {
  id: string;
  title: string;
  start: string; // ISO date string
  end: string;   // ISO date string
  isAllDay: boolean;
  calendarId: string;
  calendarName: string;
  calendarColor: string;
  calendarIcon?: string;
}

interface BackendCalendarResponse {
  events: BackendCalendarEvent[];
  fetchedAt: string;
  error?: string;
}

/**
 * Fetch calendar events from backend API
 * Backend handles OAuth token refresh and Google Calendar API calls
 */
export async function fetchCalendarEvents(): Promise<CalendarData> {
  const response = await fetch(`${BACKEND_API}/api/calendar/events`);

  if (!response.ok) {
    throw new Error('Kunne ikke hente kalenderdata');
  }

  const data: BackendCalendarResponse = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  // Convert ISO date strings to Date objects
  const events = data.events.map((event) => ({
    ...event,
    start: event.isAllDay ? parseAllDayDate(event.start) : new Date(event.start),
    end: event.isAllDay ? parseAllDayDate(event.end) : new Date(event.end),
  }));

  return {
    events,
    fetchedAt: new Date(data.fetchedAt),
  };
}

/**
 * Parse all-day date string (YYYY-MM-DD) as local date
 */
function parseAllDayDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Get events for a specific day
 */
export function getEventsForDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  return events.filter((event) => {
    // For all-day events, check if the date falls within the event range
    if (event.isAllDay) {
      const eventStart = new Date(event.start);
      eventStart.setHours(0, 0, 0, 0);
      const eventEnd = new Date(event.end);
      eventEnd.setHours(0, 0, 0, 0);
      return dayStart >= eventStart && dayStart < eventEnd;
    }

    // For timed events, check if event starts or spans this day
    return (
      (event.start >= dayStart && event.start <= dayEnd) ||
      (event.start < dayStart && event.end > dayStart)
    );
  });
}

/**
 * Format time for display (HH:MM)
 */
export function formatEventTime(date: Date): string {
  return date.toLocaleTimeString('nb-NO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
