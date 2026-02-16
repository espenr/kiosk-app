/**
 * Photos service for loading photo URLs from backend proxy
 *
 * The backend proxy fetches fresh URLs from iCloud Shared Album API
 * with caching to handle URL expiration gracefully.
 */

export interface Photo {
  url: string;
}

export interface PhotosData {
  photos: Photo[];
  updatedAt: Date;
  cached?: boolean;
  expiresAt?: Date;
}

interface ApiResponse {
  photos: Photo[];
  cached: boolean;
  expiresAt: string;
  error?: string;
}

/**
 * Fetch photos from the backend proxy API
 * Falls back to static photos.json for backwards compatibility
 */
export async function fetchPhotos(): Promise<PhotosData> {
  try {
    // Try the API endpoint first
    const response = await fetch('/api/photos');

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data: ApiResponse = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.photos || data.photos.length === 0) {
      throw new Error('Ingen bilder funnet i albumet');
    }

    // Filter out any entries without valid URLs
    const validPhotos = data.photos.filter(
      (photo): photo is Photo =>
        photo !== null &&
        typeof photo === 'object' &&
        typeof photo.url === 'string' &&
        photo.url.length > 0
    );

    if (validPhotos.length === 0) {
      throw new Error('Ingen gyldige bilde-URLer funnet');
    }

    return {
      photos: validPhotos,
      updatedAt: new Date(),
      cached: data.cached,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    };
  } catch (apiError) {
    // Fall back to static photos.json (backwards compatibility)
    console.warn('API fetch failed, trying static file:', apiError);

    const cacheBuster = Math.floor(Date.now() / 60000);
    const response = await fetch(`/photos.json?t=${cacheBuster}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Ingen bilder konfigurert. Sjekk server-konfigurasjon.');
      }
      throw new Error(`Kunne ikke hente bilder: ${response.status}`);
    }

    const data: Photo[] = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Ingen bilder funnet i albumet');
    }

    const validPhotos = data.filter(
      (photo): photo is Photo =>
        photo !== null &&
        typeof photo === 'object' &&
        typeof photo.url === 'string' &&
        photo.url.length > 0
    );

    if (validPhotos.length === 0) {
      throw new Error('Ingen gyldige bilde-URLer funnet');
    }

    return {
      photos: validPhotos,
      updatedAt: new Date(),
    };
  }
}

/**
 * Preload an image to ensure smooth transitions
 * Returns a promise that resolves when the image is loaded
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}
