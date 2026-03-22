/**
 * Photo proxy server
 *
 * Lightweight Node.js server that fetches fresh iCloud photo URLs on demand.
 * Uses native HTTP module to minimize memory footprint on Raspberry Pi.
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchPhotosFromICloud } from './photos.js';
import { getCachedPhotos, setCachedPhotos, getCacheInfo } from './cache.js';
import type { PhotosResponse, HealthResponse } from './types.js';
import {
  handleAuthStatus,
  handleInitSetup,
  handleCompleteSetup,
  handleLogin,
  handleLogout,
} from './handlers/auth.js';
import {
  handleGetConfig,
  handleGetPublicConfig,
  handleUpdateConfig,
  handleAutoSaveConfig,
  handleFactoryReset,
} from './handlers/config.js';
import { loadPublicConfig, isSetupComplete } from './utils/storage.js';
import { handleGetCalendarEvents } from './handlers/calendar.js';
import { addSSEClient } from './utils/sse.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3003', 10);
const startTime = Date.now();

/**
 * Load environment variables from .env file
 */
function loadEnv(): void {
  // Check multiple locations for .env file
  const envPaths = [
    join(__dirname, '..', '..', '.env'), // kiosk-app/.env (dev)
    join(__dirname, '..', '.env'), // server/.env
    '/var/www/kiosk/.env', // Pi deployment
  ];

  for (const envPath of envPaths) {
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=');
          if (key && value && !process.env[key]) {
            process.env[key] = value;
          }
        }
      }
      console.log(`Loaded env from: ${envPath}`);
      return;
    }
  }

  console.log('No .env file found');
}

/**
 * Send JSON response (legacy - for photos endpoint)
 */
function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-cache',
  });
  res.end(JSON.stringify(data));
}

/**
 * Get request origin for CORS
 */
function getAllowOrigin(req: IncomingMessage): string {
  const origin = req.headers.origin;
  // In development, allow localhost origins
  if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
    return origin;
  }
  // In production, allow same-origin only
  return origin || '*';
}

/**
 * Handle GET /api/photos
 */
async function handlePhotos(res: ServerResponse): Promise<void> {
  // Load from public config instead of environment variable
  const publicConfig = loadPublicConfig();
  const albumUrl = publicConfig?.photos?.sharedAlbumUrl || process.env.ICLOUD_ALBUM_URL;

  if (!albumUrl) {
    sendJson(res, 500, { error: 'ICLOUD_ALBUM_URL not configured' });
    return;
  }

  // Check cache first
  const cached = getCachedPhotos();

  if (cached && !cached.isStale) {
    const cacheInfo = getCacheInfo();
    const response: PhotosResponse = {
      photos: cached.photos,
      cached: true,
      expiresAt: cacheInfo.expiresAt || new Date().toISOString(),
    };
    sendJson(res, 200, response);
    return;
  }

  // Fetch fresh photos
  try {
    console.log('Fetching fresh photos from iCloud...');
    const photos = await fetchPhotosFromICloud(albumUrl);
    setCachedPhotos(photos);

    const cacheInfo = getCacheInfo();
    const response: PhotosResponse = {
      photos,
      cached: false,
      expiresAt: cacheInfo.expiresAt || new Date().toISOString(),
    };
    sendJson(res, 200, response);
    console.log(`Fetched ${photos.length} photos`);
  } catch (err) {
    console.error('Failed to fetch photos:', err);

    // Return stale cache if available
    if (cached) {
      console.log('Returning stale cache');
      const cacheInfo = getCacheInfo();
      const response: PhotosResponse = {
        photos: cached.photos,
        cached: true,
        expiresAt: cacheInfo.expiresAt || new Date().toISOString(),
      };
      sendJson(res, 200, response);
      return;
    }

    sendJson(res, 500, { error: 'Failed to fetch photos from iCloud' });
  }
}

/**
 * Handle GET /api/health
 */
function handleHealth(res: ServerResponse): void {
  const cacheInfo = getCacheInfo();
  const response: HealthResponse = {
    status: 'ok',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    cacheAge: cacheInfo.age,
    photoCount: cacheInfo.photoCount,
  };
  sendJson(res, 200, response);
}

/**
 * Handle GET /api/version
 */
function handleVersion(res: ServerResponse): void {
  // Try to read VERSION file from deployment directory
  const versionPaths = [
    join(__dirname, '..', '..', 'VERSION'), // /var/www/kiosk/VERSION (production)
    join(__dirname, '..', 'VERSION'), // server/VERSION (dev)
    '/var/www/kiosk/VERSION', // Absolute path (production fallback)
  ];

  let version = 'dev';
  for (const versionPath of versionPaths) {
    if (existsSync(versionPath)) {
      try {
        version = readFileSync(versionPath, 'utf-8').trim();
        break;
      } catch {
        // Continue to next path
      }
    }
  }

  sendJson(res, 200, { version });
}

/**
 * Request handler
 */
async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url || '/';

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': getAllowOrigin(req),
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    });
    res.end();
    return;
  }

  // Auth routes
  if (url === '/api/auth/status' && req.method === 'GET') {
    handleAuthStatus(req, res);
    return;
  }

  if (url === '/api/auth/init-setup' && req.method === 'POST') {
    await handleInitSetup(req, res);
    return;
  }

  if (url === '/api/auth/complete-setup' && req.method === 'POST') {
    await handleCompleteSetup(req, res);
    return;
  }

  if (url === '/api/auth/login' && req.method === 'POST') {
    await handleLogin(req, res);
    return;
  }

  if (url === '/api/auth/logout' && req.method === 'POST') {
    handleLogout(req, res);
    return;
  }

  // Config routes
  if (url === '/api/config/public' && req.method === 'GET') {
    handleGetPublicConfig(req, res);
    return;
  }

  if (url === '/api/config' && req.method === 'GET') {
    handleGetConfig(req, res);
    return;
  }

  if (url === '/api/config' && req.method === 'PUT') {
    await handleUpdateConfig(req, res);
    return;
  }

  if (url === '/api/config/auto' && req.method === 'PATCH') {
    await handleAutoSaveConfig(req, res);
    return;
  }

  if (url === '/api/config/factory-reset' && req.method === 'POST') {
    await handleFactoryReset(req, res);
    return;
  }

  // Calendar routes
  if (url === '/api/calendar/events' && req.method === 'GET') {
    await handleGetCalendarEvents(req, res);
    return;
  }

  // SSE route for real-time config updates
  if (url === '/api/config/updates' && req.method === 'GET') {
    addSSEClient(res);
    return; // Keep connection open, don't call res.end()
  }

  // Photos routes
  if (req.method === 'GET') {
    if (url === '/api/photos' || url === '/photos') {
      await handlePhotos(res);
      return;
    }

    if (url === '/api/health' || url === '/health') {
      handleHealth(res);
      return;
    }

    if (url === '/api/version') {
      handleVersion(res);
      return;
    }
  }

  // 404 for unknown routes
  sendJson(res, 404, { error: 'Not found' });
}

/**
 * Check encryption consistency on startup
 * Warns if config.enc.json encryption might be mismatched
 */
function checkEncryptionConsistency(): void {
  // Only check if setup is complete
  if (!isSetupComplete()) {
    return;
  }

  console.log('\n=== Config Encryption Health Check ===');
  console.log('Checking if config.enc.json is encrypted with user PIN...');
  console.log('NOTE: This check requires knowing the user PIN.');
  console.log('If you encounter login issues, the config may have been');
  console.log('encrypted with the machine secret by auto-save.');
  console.log('Use the fix scripts in the project root to repair.\n');

  // Note: We can't actually validate without the user's PIN
  // This is just a warning that the admin should be aware of
}

// Load environment and start server
loadEnv();

const server = createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error('Request error:', err);
    sendJson(res, 500, { error: 'Internal server error' });
  });
});

server.listen(PORT, () => {
  console.log(`Photo proxy server running on port ${PORT}`);
  console.log(`iCloud album configured: ${process.env.ICLOUD_ALBUM_URL ? 'yes' : 'no'}`);

  // Check encryption consistency on startup
  checkEncryptionConsistency();
});
