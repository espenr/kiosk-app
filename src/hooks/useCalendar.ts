import { useState, useEffect, useCallback } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { fetchCalendarEvents, CalendarEvent } from '../services/calendar';

interface UseCalendarResult {
  events: CalendarEvent[];
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean;
  refresh: () => void;
}

// Cache calendar data for 15 minutes
const CACHE_DURATION = 15 * 60 * 1000;
// Refresh calendar every 15 minutes
const REFRESH_INTERVAL = 15 * 60 * 1000;

let cachedEvents: CalendarEvent[] = [];
let cacheTimestamp = 0;

/**
 * Invalidate calendar cache to force immediate refetch
 * Call this when calendar configuration changes
 */
export function invalidateCalendarCache(): void {
  cachedEvents = [];
  cacheTimestamp = 0;
}

/**
 * Hook to fetch and manage calendar data from backend API
 * Backend handles OAuth and Google Calendar API calls
 */
export function useCalendar(): UseCalendarResult {
  const { config } = useConfig();
  const { serviceAccountKey, configured } = config.calendar;

  // Calendar is configured if:
  // - We have serviceAccountKey (admin view with authenticated config)
  // - OR configured flag is true (dashboard view with public config)
  const isConfigured = Boolean(serviceAccountKey || configured);

  const [events, setEvents] = useState<CalendarEvent[]>(cachedEvents);
  const [isLoading, setIsLoading] = useState(!cachedEvents.length && isConfigured);
  const [error, setError] = useState<string | null>(null);

  // Create a dependency key from calendar config to trigger refetch when colors/names change
  const calendarConfigKey = JSON.stringify(
    config.calendar.calendars.map(cal => ({ id: cal.id, color: cal.color, name: cal.name }))
  );

  const fetchData = useCallback(
    async (force = false) => {
      // Check if configured
      if (!isConfigured) {
        setError(null);
        setIsLoading(false);
        return;
      }

      // Check cache (unless force refresh)
      if (!force && cachedEvents.length > 0 && Date.now() - cacheTimestamp < CACHE_DURATION) {
        setEvents(cachedEvents);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchCalendarEvents();
        cachedEvents = data.events;
        cacheTimestamp = Date.now();
        setEvents(data.events);
        setError(null);
      } catch (err) {
        console.error('Calendar fetch error:', err);
        setError(err instanceof Error ? err.message : 'Kunne ikke hente kalenderdata');
        // Keep showing old data if available
        if (cachedEvents.length > 0) {
          setEvents(cachedEvents);
        }
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isConfigured, calendarConfigKey] // Refetch when calendar config changes
  );

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 15 minutes
  useEffect(() => {
    if (!isConfigured) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchData, isConfigured]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return { events, isLoading, error, isConfigured, refresh };
}
