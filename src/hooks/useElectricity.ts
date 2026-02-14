import { useState, useEffect, useCallback } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { fetchElectricityPrices, ElectricityData } from '../services/tibber';

export interface UseElectricityResult {
  electricity: ElectricityData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

// Cache electricity data for 5 minutes (prices update hourly)
const CACHE_DURATION = 5 * 60 * 1000;
// Refresh every 5 minutes
const REFRESH_INTERVAL = 5 * 60 * 1000;

let cachedElectricity: ElectricityData | null = null;
let cacheTimestamp = 0;

/**
 * Hook to fetch and manage electricity price data from Tibber
 */
export function useElectricity(): UseElectricityResult {
  const { config } = useConfig();
  const token = config.apiKeys.tibber;

  const [electricity, setElectricity] = useState<ElectricityData | null>(cachedElectricity);
  const [isLoading, setIsLoading] = useState(!cachedElectricity);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (force = false) => {
    // Check cache (unless force refresh)
    if (!force && cachedElectricity && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setElectricity(cachedElectricity);
      setIsLoading(false);
      return;
    }

    // Need valid token
    if (!token) {
      setError('Tibber API-nøkkel ikke konfigurert');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchElectricityPrices(token);
      cachedElectricity = data;
      cacheTimestamp = Date.now();
      setElectricity(data);
      setError(null);
    } catch (err) {
      console.error('Electricity fetch error:', err);
      setError(err instanceof Error ? err.message : 'Kunne ikke hente strømpriser');
      // Keep showing old data if available
      if (cachedElectricity) {
        setElectricity(cachedElectricity);
      }
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return { electricity, isLoading, error, refresh };
}
