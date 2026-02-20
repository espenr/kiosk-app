/**
 * Calendar API handler - Proxies requests to Google Calendar API
 *
 * Keeps calendar credentials (client secret, refresh token) server-side
 * and exposes only the calendar events to the frontend.
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sendJson } from '../utils/http.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = join(__dirname, '..', '..', 'data', 'config.internal.json');

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// Access token cache
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

interface CalendarEvent {
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

interface CalendarResponse {
  events: CalendarEvent[];
  fetchedAt: string;
  cached?: boolean;
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
}

interface GoogleCalendarResponse {
  items?: GoogleCalendarEvent[];
  error?: {
    message: string;
    code: number;
  };
}

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
    throw new Error('Failed to refresh calendar access token');
  }

  const data = await response.json();
  cachedAccessToken = data.access_token as string;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;

  return cachedAccessToken as string;
}

/**
 * Fetch events from a single calendar
 */
async function fetchSingleCalendarEvents(
  accessToken: string,
  calendarId: string,
  calendarName: string,
  calendarColor: string,
  calendarIcon: string | undefined,
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

  const url = `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Calendar API error for ${calendarName}:`, error);
    // Return empty array instead of throwing - don't fail all calendars for one error
    return [];
  }

  const data: GoogleCalendarResponse = await response.json();

  if (data.error) {
    console.error(`Calendar error for ${calendarName}:`, data.error.message);
    return [];
  }

  return (data.items || []).map((item) => {
    const isAllDay = !item.start.dateTime;
    const start = isAllDay ? item.start.date! : item.start.dateTime!;
    const end = isAllDay ? item.end.date! : item.end.dateTime!;

    return {
      id: `${calendarId}-${item.id}`,
      title: item.summary || '(Ingen tittel)',
      start,
      end,
      isAllDay,
      calendarId,
      calendarName,
      calendarColor,
      calendarIcon,
    };
  });
}

interface InternalConfig {
  calendar?: {
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    calendars?: Array<{
      id: string;
      name: string;
      color: string;
      icon?: string;
    }>;
  };
}

/**
 * Load internal config (calendar credentials for backend use)
 */
function loadInternalConfig(): InternalConfig {
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }

  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Failed to load internal config:', err);
    return {};
  }
}

/**
 * Handle GET /api/calendar/events
 */
export async function handleGetCalendarEvents(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    // Load config from internal storage (no PIN required)
    const config = loadInternalConfig();

    // Check if calendar is configured
    const { clientId, clientSecret, refreshToken, calendars } = config.calendar || {};

    if (!clientId || !clientSecret || !refreshToken || !calendars || calendars.length === 0) {
      sendJson(res, 200, {
        events: [],
        fetchedAt: new Date().toISOString(),
        error: 'Calendar not configured',
      } as CalendarResponse, { allowOrigin: req.headers.origin });
      return;
    }

    // Get access token
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
      calendars.map((cal) =>
        fetchSingleCalendarEvents(
          accessToken,
          cal.id,
          cal.name,
          cal.color,
          cal.icon,
          timeMin,
          timeMax
        )
      )
    );

    // Merge and sort all events by start time
    const events = eventArrays
      .flat()
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    const response: CalendarResponse = {
      events,
      fetchedAt: new Date().toISOString(),
    };

    sendJson(res, 200, response, { allowOrigin: req.headers.origin });
  } catch (err) {
    console.error('Calendar events error:', err);
    const message = err instanceof Error ? err.message : 'Failed to fetch calendar events';
    sendJson(res, 500, { error: message }, { allowOrigin: req.headers.origin });
  }
}
