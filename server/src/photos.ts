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
  // The API returns multiple derivatives per photo (thumbnail + full size)
  // We want to take every other one (the larger size, usually index 0 of each pair)
  const items = Object.values(urlsData.items);
  const photos: Photo[] = [];

  // Take every other item (the larger derivative)
  for (let i = 0; i < items.length; i += 2) {
    const item = items[i];
    if (item.url_location && item.url_path) {
      photos.push({
        url: `https://${item.url_location}${item.url_path}`,
      });
    }
  }

  return photos;
}
