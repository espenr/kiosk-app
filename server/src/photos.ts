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

  // Build photo URLs from response
  // iCloud returns ~2 derivatives per photo, but they're not in consecutive pairs
  // Group by filename and take the first occurrence of each unique photo
  const photos: Photo[] = [];
  const seenFilenames = new Set<string>();

  for (const item of items) {
    if (!item.url_location || !item.url_path) continue;

    const filename = getFilename(item.url_path);

    // Skip if we've already seen this filename
    if (seenFilenames.has(filename)) {
      continue;
    }

    seenFilenames.add(filename);
    photos.push({
      url: `https://${item.url_location}${item.url_path}`,
    });
  }

  console.log(`[Photo] Selected ${photos.length} unique photos from ${items.length} total derivatives (${items.length - photos.length} duplicates skipped)`);

  return photos;
}
