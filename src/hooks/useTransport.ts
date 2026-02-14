import { useState, useEffect, useCallback, useMemo } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { fetchDeparturesFromMultipleStops, Departure } from '../services/entur';

interface UseTransportResult {
  departures: Departure[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  lastUpdated: Date | null;
}

// Refresh departures every minute
const REFRESH_INTERVAL = 60 * 1000;

/**
 * Hook to fetch and manage public transport departures
 */
export function useTransport(): UseTransportResult {
  const { config } = useConfig();

  // Memoize stopPlaceIds to prevent unnecessary re-renders
  const stopPlaceIds = useMemo(
    () => config.location.stopPlaceIds || [],
    [config.location.stopPlaceIds]
  );

  const [departures, setDepartures] = useState<Departure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (stopPlaceIds.length === 0) {
      setError('Ingen holdeplasser konfigurert');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchDeparturesFromMultipleStops(stopPlaceIds, 10);
      setDepartures(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Transport fetch error:', err);
      setError(err instanceof Error ? err.message : 'Kunne ikke hente avganger');
      // Keep showing old data if available
    } finally {
      setIsLoading(false);
    }
  }, [stopPlaceIds]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every minute
  useEffect(() => {
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return { departures, isLoading, error, refresh, lastUpdated };
}
