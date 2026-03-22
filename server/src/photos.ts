/**
 * iCloud Shared Album API integration
 *
 * Fetches photo URLs from iCloud's undocumented SharedStreams API.
 * Port of scripts/sync-photos.sh to TypeScript.
 */

import type { Photo, ICloudWebstreamResponse, ICloudAssetUrlsResponse } from './types.js';

/**
 * Calculate partition from first character of token
 * Apple encodes the partition in base36: A=10, B=11, ..., Z=35, 0-9=0-9
 */
function calculatePartition(token: string): number {
  const firstChar = token.charAt(0);

  if (/[0-9]/.test(firstChar)) {
    return parseInt(firstChar, 10);
  } else if (/[A-Z]/i.test(firstChar)) {
    const upper = firstChar.toUpperCase();
    return upper.charCodeAt(0) - 55; // A=10, B=11, etc.
  }

  return 1;
}

/**
 * Extract token from iCloud shared album URL
 */
export function extractToken(albumUrl: string): string {
  const match = albumUrl.match(/#(.+)$/);
  if (!match) {
    throw new Error('Could not extract token from album URL');
  }
  return match[1];
}

/**
 * Fetch photos from iCloud Shared Album
 */
export async function fetchPhotosFromICloud(albumUrl: string): Promise<Photo[]> {
  const token = extractToken(albumUrl);
  const partition = calculatePartition(token);

  // Clamp to reasonable range
  const clampedPartition = Math.max(1, Math.min(99, partition));

  let baseUrl = `https://p${clampedPartition}-sharedstreams.icloud.com/${token}/sharedstreams`;

  // Step 1: Get photo metadata from webstream
  let webstreamResponse = await fetch(`${baseUrl}/webstream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ streamCtag: null }),
  });

  let webstreamData: ICloudWebstreamResponse = await webstreamResponse.json();

  // Check if we got a redirect to a different partition
  if (webstreamData['X-Apple-MMe-Host']) {
    const newHost = webstreamData['X-Apple-MMe-Host'];
    baseUrl = `https://${newHost}/${token}/sharedstreams`;

    // Retry with correct host
    webstreamResponse = await fetch(`${baseUrl}/webstream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ streamCtag: null }),
    });

    webstreamData = await webstreamResponse.json();
  }

  if (!webstreamData.photos || webstreamData.photos.length === 0) {
    return [];
  }

  // Extract photo GUIDs
  const photoGuids = webstreamData.photos.map((p) => p.photoGuid);

  // Step 2: Get download URLs for photos
  const urlsResponse = await fetch(`${baseUrl}/webasseturls`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoGuids }),
  });

  const urlsData: ICloudAssetUrlsResponse = await urlsResponse.json();

  if (!urlsData.items) {
    throw new Error('No items in webasseturls response');
  }

  // Build photo URLs from response
  // iCloud returns ~2 derivatives per photo (different resolutions)
  const items = Object.values(urlsData.items);

  // Helper to extract filename from URL path
  const getFilename = (path: string): string => {
    const parts = path.split('/');
    return parts[parts.length - 1]?.split('?')[0] || 'unknown';
  };

  // Helper to fetch image dimensions from URL
  async function getImageDimensions(url: string): Promise<{ width: number; height: number } | null> {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) return null;

      const buffer = await response.arrayBuffer();

      // Parse JPEG dimensions from buffer (quick check without full decode)
      const view = new DataView(buffer);

      // JPEG magic number check
      if (view.getUint16(0) !== 0xFFD8) return null;

      // Scan for SOF (Start of Frame) marker
      let offset = 2;
      while (offset < view.byteLength - 10) {
        const marker = view.getUint16(offset);

        // SOF markers (0xFFC0-0xFFC3, 0xFFC5-0xFFC7, 0xFFC9-0xFFCB, 0xFFCD-0xFFCF)
        if ((marker >= 0xFFC0 && marker <= 0xFFC3) ||
            (marker >= 0xFFC5 && marker <= 0xFFC7) ||
            (marker >= 0xFFC9 && marker <= 0xFFCB) ||
            (marker >= 0xFFCD && marker <= 0xFFCF)) {
          const height = view.getUint16(offset + 5);
          const width = view.getUint16(offset + 7);
          return { width, height };
        }

        // Skip to next marker
        const length = view.getUint16(offset + 2);
        offset += length + 2;
      }

      return null;
    } catch {
      return null;
    }
  }

  // Group derivatives by filename
  const derivativesByFilename = new Map<string, typeof items>();
  for (const item of items) {
    if (!item.url_location || !item.url_path) continue;
    const filename = getFilename(item.url_path);
    if (!derivativesByFilename.has(filename)) {
      derivativesByFilename.set(filename, []);
    }
    derivativesByFilename.get(filename)!.push(item);
  }

  console.log(`[Photo] Found ${derivativesByFilename.size} unique photos from ${items.length} derivatives`);
  console.log(`[Photo] Selecting best quality derivative for each photo...`);

  // Select best derivative for each photo
  const photos: Photo[] = [];
  let checkedCount = 0;
  let multiDerivCount = 0;

  for (const [filename, derivatives] of derivativesByFilename) {
    checkedCount++;

    if (derivatives.length === 1) {
      // Only one derivative, use it
      photos.push({
        url: `https://${derivatives[0].url_location}${derivatives[0].url_path}`,
      });
    } else {
      // Multiple derivatives - check dimensions and select largest
      multiDerivCount++;
      let bestDerivative = derivatives[0];
      let bestArea = 0;

      for (const deriv of derivatives) {
        const url = `https://${deriv.url_location}${deriv.url_path}`;
        const dims = await getImageDimensions(url);

        if (dims) {
          const area = dims.width * dims.height;
          if (area > bestArea) {
            bestArea = area;
            bestDerivative = deriv;
          }
        }
      }

      photos.push({
        url: `https://${bestDerivative.url_location}${bestDerivative.url_path}`,
      });
    }

    // Log progress every 20 photos
    if (checkedCount % 20 === 0) {
      console.log(`[Photo] Progress: ${checkedCount}/${derivativesByFilename.size} photos processed`);
    }
  }

  console.log(`[Photo] Selected ${photos.length} photos (checked dimensions for ${multiDerivCount} multi-derivative photos)`);

  return photos;
}
