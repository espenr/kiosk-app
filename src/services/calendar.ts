/**
 * Google Calendar API v3 service
 * https://developers.google.com/calendar/api/v3/reference
 *
 * Uses OAuth 2.0 with refresh token for authentication.
 * Supports multiple calendars (one per family member).
 *
 * Setup requires:
 * 1. Create OAuth credentials in Google Cloud Console (TV/Limited Input device type)
 * 2. Enable Google Calendar API
 * 3. Generate refresh token via device code flow (scripts/get-calendar-token.sh)
 * 4. Configure clientId, clientSecret, refreshToken, and calendars in app config
 */

import { CalendarSource } from '../contexts/ConfigContext';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

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

// Access token cache
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

/**
 * Exchange refresh token for access token
 */
async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedAccessToken;
  }

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Token refresh failed:', error);
    throw new Error('Kunne ikke fornye kalender-tilgang');
  }

  const data = await response.json();
  cachedAccessToken = data.access_token as string;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;

  return cachedAccessToken as string;
}

interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  colorId?: string;
}

interface GoogleCalendarResponse {
  items?: GoogleCalendarEvent[];
  error?: {
    message: string;
    code: number;
  };
}

/**
 * Fetch events from a single calendar
 */
async function fetchSingleCalendarEvents(
  accessToken: string,
  calendarSource: CalendarSource,
  timeMin: string,
  timeMax: string
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  });

  const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarSource.id)}/events?${params}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Calendar API error for ${calendarSource.name}:`, error);
    // Return empty array instead of throwing - don't fail all calendars for one error
    return [];
  }

  const data: GoogleCalendarResponse = await response.json();

  if (data.error) {
    console.error(`Calendar error for ${calendarSource.name}:`, data.error.message);
    return [];
  }

  return (data.items || []).map((item) => {
    const isAllDay = !item.start.dateTime;
    const start = isAllDay
      ? parseAllDayDate(item.start.date!)
      : new Date(item.start.dateTime!);
    const end = isAllDay
      ? parseAllDayDate(item.end.date!)
      : new Date(item.end.dateTime!);

    return {
      id: `${calendarSource.id}-${item.id}`,
      title: item.summary || '(Ingen tittel)',
      start,
      end,
      isAllDay,
      calendarId: calendarSource.id,
      calendarName: calendarSource.name,
      calendarColor: calendarSource.color,
      calendarIcon: calendarSource.icon,
    };
  });
}

/**
 * Fetch calendar events from all configured calendars for the next 7 days
 */
export async function fetchCalendarEvents(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  calendars: CalendarSource[]
): Promise<CalendarData> {
  const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

  // Calculate time range: now to 7 days from now
  const now = new Date();
  const timeMin = now.toISOString();

  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 7);
  endDate.setHours(23, 59, 59, 999);
  const timeMax = endDate.toISOString();

  // Fetch all calendars in parallel
  const eventArrays = await Promise.all(
    calendars.map((cal) => fetchSingleCalendarEvents(accessToken, cal, timeMin, timeMax))
  );

  // Merge and sort all events by start time
  const events = eventArrays
    .flat()
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  return {
    events,
    fetchedAt: new Date(),
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
