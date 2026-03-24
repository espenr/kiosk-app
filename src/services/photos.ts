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
 * Fetch with exponential backoff retry logic
 */
async function fetchWithRetry(
  url: string,
  maxRetries = 3,
  baseDelay = 2000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      return response; // Success
    } catch (err) {
      lastError = err as Error;

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff: 2s, 4s, 8s
        console.warn(
          `[Photos] Fetch failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms...`,
          err
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

/**
 * Fetch photos from the backend proxy API
 * Falls back to static photos.json for backwards compatibility
 */
export async function fetchPhotos(): Promise<PhotosData> {
  try {
    // Try the API endpoint first with retry logic
    const response = await fetchWithRetry('/api/photos', 3, 2000);

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    // Layer 1: Content-Type validation (prevent parsing HTML as JSON)
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Invalid response type: ${contentType || 'none'} (expected JSON)`);
    }

    // Layer 2: JSON parse error handling with detailed error message
    let data: ApiResponse;
    try {
      data = await response.json();
    } catch (parseError) {
      const text = await response.clone().text().catch(() => 'Unable to read response');
      const preview = text.substring(0, 100);
      throw new Error(`JSON parse error: ${(parseError as Error).message}. Response preview: ${preview}...`);
    }

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

    // Layer 1: Content-Type validation for fallback path
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Invalid fallback response type: ${contentType || 'none'} (expected JSON)`);
    }

    // Layer 2: JSON parse error handling for fallback path
    let data: Photo[];
    try {
      data = await response.json();
    } catch (parseError) {
      const text = await response.clone().text().catch(() => 'Unable to read response');
      const preview = text.substring(0, 100);
      throw new Error(`Fallback JSON parse error: ${(parseError as Error).message}. Response preview: ${preview}...`);
    }

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
 * Logs image dimensions for quality monitoring
 */
export function preloadImage(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Log actual loaded dimensions for debugging
      console.log(`[Photo] Loaded: ${img.naturalWidth}x${img.naturalHeight}px`);

      // Warn if image is lower resolution than display
      if (img.naturalWidth < 1080) {
        console.warn(
          `[Photo] Low resolution detected: ${img.naturalWidth}px width (display: 1080px). ` +
          `May appear blurry on TV.`
        );
      }

      resolve();
    };
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}
