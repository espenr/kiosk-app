import { useState, useEffect, useCallback } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { fetchWeather, WeatherData } from '../services/weather';

interface UseWeatherResult {
  weather: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

// Cache weather data for 30 minutes
const CACHE_DURATION = 30 * 60 * 1000;
// Refresh weather every 30 minutes
const REFRESH_INTERVAL = 30 * 60 * 1000;

let cachedWeather: WeatherData | null = null;
let cacheTimestamp = 0;

/**
 * Hook to fetch and manage weather data
 */
export function useWeather(): UseWeatherResult {
  const { config } = useConfig();
  const { latitude, longitude } = config.location;

  const [weather, setWeather] = useState<WeatherData | null>(cachedWeather);
  const [isLoading, setIsLoading] = useState(!cachedWeather);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (force = false) => {
    // Check cache (unless force refresh)
    if (!force && cachedWeather && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setWeather(cachedWeather);
      setIsLoading(false);
      return;
    }

    // Need valid coordinates
    if (!latitude || !longitude) {
      setError('Lokasjon ikke konfigurert');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchWeather(latitude, longitude);
      cachedWeather = data;
      cacheTimestamp = Date.now();
      setWeather(data);
      setError(null);
    } catch (err) {
      console.error('Weather fetch error:', err);
      setError(err instanceof Error ? err.message : 'Kunne ikke hente værdata');
      // Keep showing old data if available
      if (cachedWeather) {
        setWeather(cachedWeather);
      }
    } finally {
      setIsLoading(false);
    }
  }, [latitude, longitude]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(true);
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return { weather, isLoading, error, refresh };
}
