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
import jwt from 'jsonwebtoken';
import { sendJson } from '../utils/http.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = join(__dirname, '..', '..', 'data', 'config.internal.json');

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';

// Access token cache for service account
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

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

interface ServiceAccountKey {
  private_key: string;
  client_email: string;
  token_uri?: string;
}

/**
 * Generate JWT for Service Account authentication
 * Valid for 1 hour, self-signed with private key
 */
function generateServiceAccountJWT(serviceAccountKey: string): string {
  // Decode base64 JSON key
  const keyData: ServiceAccountKey = JSON.parse(
    Buffer.from(serviceAccountKey, 'base64').toString('utf-8')
  );

  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iss: keyData.client_email,
    sub: keyData.client_email,
    scope: 'https://www.googleapis.com/auth/calendar.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, // 1 hour
    iat: now,
  };

  // Sign JWT with private key
  return jwt.sign(payload, keyData.private_key, { algorithm: 'RS256' });
}

/**
 * Exchange JWT for access token via Google OAuth
 */
async function exchangeJWTForAccessToken(jwt: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange JWT for access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Get service account access token (cached)
 * Returns cached token if still valid (5-min buffer)
 */
async function getServiceAccountToken(serviceAccountKey: string): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid (5-min buffer)
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 5 * 60 * 1000) {
    console.log('Using cached access token');
    return cachedAccessToken.token;
  }

  // Generate new JWT and exchange for access token
  console.log('Generating new JWT and exchanging for access token');
  const jwt = generateServiceAccountJWT(serviceAccountKey);
  const accessToken = await exchangeJWTForAccessToken(jwt);

  cachedAccessToken = {
    token: accessToken,
    expiresAt: now + 3600 * 1000, // 1 hour
  };

  console.log('Access token obtained, expires in 1 hour');
  return accessToken;
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

  const itemCount = (data.items || []).length;
  console.log(`Calendar ${calendarName} (${calendarId}): ${itemCount} events`);

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
    serviceAccountKey?: string;
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
    const { serviceAccountKey, calendars } = config.calendar || {};

    if (!serviceAccountKey || !calendars || calendars.length === 0) {
      sendJson(res, 200, {
        events: [],
        fetchedAt: new Date().toISOString(),
        error: 'Calendar not configured',
      } as CalendarResponse, { allowOrigin: req.headers.origin });
      return;
    }

    // Get service account access token
    const accessToken = await getServiceAccountToken(serviceAccountKey);

    // Calculate time range: now to 7 days from now
    const now = new Date();
    const timeMin = now.toISOString();

    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 7);
    endDate.setHours(23, 59, 59, 999);
    const timeMax = endDate.toISOString();

    console.log(`Fetching calendar events from ${timeMin} to ${timeMax}`);

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
