import { useState, useEffect, useCallback, useRef } from 'react';
import { useConfig } from '../contexts/ConfigContext';
import { fetchPhotos, preloadImage, Photo, PhotosData } from '../services/photos';

export interface UsePhotosResult {
  photos: Photo[];
  currentPhoto: Photo | null;
  currentIndex: number;
  isLoading: boolean;
  error: string | null;
  isConfigured: boolean;
  next: () => void;
  previous: () => void;
  goTo: (index: number) => void;
}

// Cache photos for 5 minutes (server handles real caching with 45-min TTL)
const CACHE_DURATION = 5 * 60 * 1000;
// Check for new photos every 10 minutes (server cache handles freshness)
const REFRESH_INTERVAL = 10 * 60 * 1000;

let cachedPhotos: PhotosData | null = null;
let cacheTimestamp = 0;

/**
 * Hook to manage photo slideshow state
 * Loads photos from /photos.json and handles slideshow timing
 */
export function usePhotos(): UsePhotosResult {
  const { config } = useConfig();
  const interval = config.photos.interval || 30; // seconds

  const [photos, setPhotos] = useState<Photo[]>(cachedPhotos?.photos || []);
  const [currentIndex, setCurrentIndex] = useState(-1); // -1 means "not initialized"
  const [isLoading, setIsLoading] = useState(!cachedPhotos);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const preloadedRef = useRef<Set<string>>(new Set());

  // Fetch photos from JSON file
  const fetchData = useCallback(async (force = false) => {
    // Check cache
    if (!force && cachedPhotos && Date.now() - cacheTimestamp < CACHE_DURATION) {
      setPhotos(cachedPhotos.photos);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchPhotos();
      cachedPhotos = data;
      cacheTimestamp = Date.now();
      setPhotos(data.photos);
      setError(null);

      // Initialize to random index on first load, or keep current if valid
      setCurrentIndex((prev) => {
        if (prev === -1 && data.photos.length > 0) {
          // First load: start at random position
          return Math.floor(Math.random() * data.photos.length);
        }
        // Subsequent loads: keep position or reset if out of bounds
        return prev >= data.photos.length ? 0 : prev;
      });
    } catch (err) {
      console.error('Photos fetch error:', err);
      setError(err instanceof Error ? err.message : 'Kunne ikke hente bilder');
      // Keep showing old photos if available
      if (cachedPhotos) {
        setPhotos(cachedPhotos.photos);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh to pick up new photos
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      fetchData(true);
    }, REFRESH_INTERVAL);

    return () => clearInterval(refreshInterval);
  }, [fetchData]);

  // Preload next image for smooth transitions
  const preloadNext = useCallback(
    (index: number) => {
      if (photos.length === 0) return;

      const nextIndex = (index + 1) % photos.length;
      const nextPhoto = photos[nextIndex];

      if (nextPhoto && !preloadedRef.current.has(nextPhoto.url)) {
        preloadImage(nextPhoto.url)
          .then(() => {
            preloadedRef.current.add(nextPhoto.url);
          })
          .catch(() => {
            // Silently ignore preload failures
          });
      }
    },
    [photos]
  );

  // Navigation functions
  const next = useCallback(() => {
    if (photos.length === 0) return;
    setCurrentIndex((prev) => {
      const newIndex = (prev + 1) % photos.length;
      preloadNext(newIndex);
      return newIndex;
    });
  }, [photos.length, preloadNext]);

  const previous = useCallback(() => {
    if (photos.length === 0) return;
    setCurrentIndex((prev) => {
      const newIndex = prev === 0 ? photos.length - 1 : prev - 1;
      preloadNext(newIndex);
      return newIndex;
    });
  }, [photos.length, preloadNext]);

  const goTo = useCallback(
    (index: number) => {
      if (index >= 0 && index < photos.length) {
        setCurrentIndex(index);
        preloadNext(index);
      }
    },
    [photos.length, preloadNext]
  );

  // Auto-advance slideshow
  useEffect(() => {
    if (photos.length <= 1 || currentIndex < 0) return;

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      next();
    }, interval * 1000);

    // Preload next image on mount
    preloadNext(currentIndex);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [photos.length, interval, next, preloadNext, currentIndex]);

  // Check if photos are configured (file exists and has photos)
  const isConfigured = photos.length > 0;

  const currentPhoto = photos.length > 0 && currentIndex >= 0 ? photos[currentIndex] : null;

  return {
    photos,
    currentPhoto,
    currentIndex,
    isLoading,
    error,
    isConfigured,
    next,
    previous,
    goTo,
  };
}
