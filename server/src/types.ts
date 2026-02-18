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

/**
 * Admin authentication types
 */

export interface AuthData {
  pinHash: string; // scrypt hash of PIN (for verification)
  salt: string; // 32-byte salt for key derivation
  setupComplete: boolean;
  firstTimeCode?: string; // 6-char code during setup
  firstTimeCodeExpiry?: number; // Unix timestamp
}

export interface CalendarSource {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface KioskConfig {
  location: {
    latitude: number;
    longitude: number;
    stopPlaceIds: string[];
  };
  apiKeys: {
    tibber: string;
  };
  electricity: {
    gridFee: number;
  };
  photos: {
    sharedAlbumUrl: string;
    interval: number;
  };
  calendar: {
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
    calendars: CalendarSource[];
  };
}

export interface AuthStatusResponse {
  setupComplete: boolean;
  authenticated?: boolean;
  requiresFirstTimeCode?: boolean;
  firstTimeCode?: string;
  codeExpired?: boolean;
}

export interface LoginRequest {
  pin: string;
}

export interface CompleteSetupRequest {
  code: string;
  pin: string;
  config: KioskConfig;
}

export interface UpdateConfigRequest {
  config: KioskConfig;
  pin: string;
}

export interface FactoryResetRequest {
  pin: string;
}
