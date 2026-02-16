/**
 * Simple in-memory cache for photo URLs
 *
 * - TTL: 45 minutes (URLs expire at ~2 hours)
 * - Max stale: 90 minutes (serve stale on iCloud error)
 */

import type { CacheEntry, Photo } from './types.js';

const CACHE_TTL_MS = 45 * 60 * 1000; // 45 minutes
const MAX_STALE_MS = 90 * 60 * 1000; // 90 minutes

let cache: CacheEntry<Photo[]> | null = null;

/**
 * Get cached photos if still valid
 * Returns null if cache is empty or too stale
 */
export function getCachedPhotos(): { photos: Photo[]; isStale: boolean } | null {
  if (!cache) {
    return null;
  }

  const now = Date.now();
  const age = now - cache.timestamp;

  // Cache is fresh
  if (age < CACHE_TTL_MS) {
    return { photos: cache.data, isStale: false };
  }

  // Cache is stale but usable
  if (age < MAX_STALE_MS) {
    return { photos: cache.data, isStale: true };
  }

  // Cache is too old
  return null;
}

/**
 * Store photos in cache
 */
export function setCachedPhotos(photos: Photo[]): void {
  const now = Date.now();
  cache = {
    data: photos,
    timestamp: now,
    expiresAt: now + CACHE_TTL_MS,
  };
}

/**
 * Get cache metadata for health endpoint
 */
export function getCacheInfo(): { age: number | null; photoCount: number; expiresAt: string | null } {
  if (!cache) {
    return { age: null, photoCount: 0, expiresAt: null };
  }

  return {
    age: Math.floor((Date.now() - cache.timestamp) / 1000),
    photoCount: cache.data.length,
    expiresAt: new Date(cache.expiresAt).toISOString(),
  };
}

/**
 * Clear the cache (useful for testing)
 */
export function clearCache(): void {
  cache = null;
}
