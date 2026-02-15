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
 * Hook to fetch and manage calendar data from multiple family calendars
 */
export function useCalendar(): UseCalendarResult {
  const { config } = useConfig();
  const { clientId, clientSecret, refreshToken, calendars } = config.calendar;

  // Need OAuth credentials AND at least one calendar configured
  const isConfigured = Boolean(
    clientId && clientSecret && refreshToken && calendars && calendars.length > 0
  );

  const [events, setEvents] = useState<CalendarEvent[]>(cachedEvents);
  const [isLoading, setIsLoading] = useState(!cachedEvents.length && isConfigured);
  const [error, setError] = useState<string | null>(null);

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
        const data = await fetchCalendarEvents(
          clientId!,
          clientSecret!,
          refreshToken!,
          calendars!
        );
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
    [clientId, clientSecret, refreshToken, calendars, isConfigured]
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
