/**
 * Shared types for the photo proxy server
 */

export interface Photo {
  url: string;
}

export interface PhotosResponse {
  photos: Photo[];
  cached: boolean;
  expiresAt: string;
}

export interface HealthResponse {
  status: 'ok' | 'error';
  uptime: number;
  cacheAge: number | null;
  photoCount: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface ICloudWebstreamResponse {
  photos?: Array<{
    photoGuid: string;
    derivatives?: Record<string, unknown>;
  }>;
  'X-Apple-MMe-Host'?: string;
}

export interface ICloudAssetUrlsResponse {
  items?: Record<
    string,
    {
      url_location: string;
      url_path: string;
    }
  >;
}
