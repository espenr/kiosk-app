/**
 * Configuration management endpoints
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import { writeFileSync, existsSync, mkdirSync, chmodSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAuthData, loadConfig, saveConfig, deleteConfigData, loadPublicConfig, savePublicConfig } from '../utils/storage.js';
import { hashPin, encrypt, decrypt } from '../utils/crypto.js';
import { getConfigFromSession, cacheConfigInSession } from '../utils/sessions.js';
import { parseJsonBody, sendJson, requireAuth } from '../utils/http.js';
import type { UpdateConfigRequest, FactoryResetRequest, PublicConfig, KioskConfig } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');
const INTERNAL_CONFIG_FILE = join(DATA_DIR, 'config.internal.json');

/**
 * Save calendar configuration to internal file for backend access
 * This allows the backend to read calendar credentials without requiring PIN
 */
export function saveInternalCalendarConfig(config: KioskConfig): void {
  try {
    // Ensure data directory exists
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
    }

    const internalConfig = {
      calendar: {
        serviceAccountKey: config.calendar.serviceAccountKey,
        calendars: config.calendar.calendars,
      },
    };

    const content = JSON.stringify(internalConfig, null, 2);
    writeFileSync(INTERNAL_CONFIG_FILE, content, { mode: 0o600 });
    chmodSync(INTERNAL_CONFIG_FILE, 0o600); // Ensure permissions
    console.log('Saved internal calendar config');
  } catch (err) {
    console.error('Failed to save internal calendar config:', err);
    // Don't throw - this is not critical for main config save
  }
}

/**
 * GET /api/config
 * Get current configuration (requires authentication)
 */
export function handleGetConfig(req: IncomingMessage, res: ServerResponse): void {
  try {
    // Validate session
    const sessionId = requireAuth(req);

    // Get cached config from session
    const config = getConfigFromSession(sessionId);
    if (!config) {
      sendJson(res, 500, { error: 'Config not found in session' });
      return;
    }

    sendJson(res, 200, config, { allowOrigin: req.headers.origin, allowCredentials: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Authentication required';
    sendJson(res, 401, { error: message }, { allowOrigin: req.headers.origin, allowCredentials: true });
  }
}

/**
 * GET /api/config/public
 * Get public configuration (no authentication required)
 * Returns only non-sensitive data needed by the dashboard
 */
export function handleGetPublicConfig(req: IncomingMessage, res: ServerResponse): void {
  try {
    // Load auth data to check if setup is complete
    const authData = loadAuthData();
    if (!authData || !authData.setupComplete) {
      // Return default config if setup not complete
      const defaultConfig: PublicConfig = {
        location: { latitude: 63.4325, longitude: 10.6379, stopPlaceIds: [] },
        apiKeys: { tibber: '' },
        electricity: { gridFee: { day: 0.3604, night: 0.2292 } },
        photos: { sharedAlbumUrl: '', interval: 30 },
        calendar: { calendars: [], configured: false },
      };
      sendJson(res, 200, defaultConfig, { allowOrigin: req.headers.origin });
      return;
    }

    // Load public config from disk
    const publicConfig = loadPublicConfig();
    if (!publicConfig) {
      // Return default config if file doesn't exist
      const defaultConfig: PublicConfig = {
        location: { latitude: 63.4325, longitude: 10.6379, stopPlaceIds: [] },
        apiKeys: { tibber: '' },
        electricity: { gridFee: { day: 0.3604, night: 0.2292 } },
        photos: { sharedAlbumUrl: '', interval: 30 },
        calendar: { calendars: [], configured: false },
      };
      sendJson(res, 200, defaultConfig, { allowOrigin: req.headers.origin });
      return;
    }

    sendJson(res, 200, publicConfig, { allowOrigin: req.headers.origin });
  } catch (err) {
    console.error('Get public config error:', err);
    const message = err instanceof Error ? err.message : 'Failed to load public config';
    sendJson(res, 500, { error: message }, { allowOrigin: req.headers.origin });
  }
}

/**
 * PATCH /api/config/auto
 * Auto-save configuration (requires authentication, no PIN needed)
 *
 * IMPORTANT: This endpoint does NOT update config.enc.json to prevent encryption key mismatches.
 * Only manual saves with PIN verification (handleUpdateConfig) should update config.enc.json.
 * Auto-save only updates public and internal configs for dashboard/backend access.
 */
export async function handleAutoSaveConfig(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    // Validate session
    const sessionId = requireAuth(req);

    // Parse request body
    const config = await parseJsonBody<KioskConfig>(req);

    if (!config) {
      sendJson(res, 400, { error: 'Config required' });
      return;
    }

    const authData = loadAuthData();
    if (!authData) {
      sendJson(res, 500, { error: 'Auth data not found' });
      return;
    }

    // Add timestamp for conflict detection
    const configWithTimestamp = {
      ...config,
      lastModified: Date.now(),
    };

    // CRITICAL: Only save public and internal configs
    // Do NOT update config.enc.json to prevent encryption key mismatch
    // The encrypted config should only be updated via handleUpdateConfig with PIN verification
    savePublicConfig(configWithTimestamp);
    saveInternalCalendarConfig(configWithTimestamp);

    // Update session cache
    cacheConfigInSession(sessionId, configWithTimestamp);

    console.log('[Auto-save] Updated public and internal configs (encrypted config unchanged)');

    // Return updated config with timestamp
    sendJson(res, 200, configWithTimestamp, { allowOrigin: req.headers.origin, allowCredentials: true });
  } catch (err) {
    console.error('Auto-save config error:', err);
    const message = err instanceof Error ? err.message : 'Failed to auto-save config';
    const statusCode = message.includes('authenticate') || message.includes('Session') ? 401 : 500;
    sendJson(res, statusCode, { error: message }, { allowOrigin: req.headers.origin, allowCredentials: true });
  }
}

/**
 * PUT /api/config
 * Update configuration (requires authentication + PIN re-verification)
 */
export async function handleUpdateConfig(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    // Validate session
    const sessionId = requireAuth(req);

    // Parse request body
    const body = await parseJsonBody<UpdateConfigRequest>(req);
    const { config, pin } = body;

    if (!config || !pin) {
      sendJson(res, 400, { error: 'Config and PIN required' });
      return;
    }

    // Verify PIN
    const authData = loadAuthData();
    if (!authData) {
      sendJson(res, 500, { error: 'Auth data not found' });
      return;
    }

    const pinHash = hashPin(pin, authData.salt);
    if (pinHash !== authData.pinHash) {
      sendJson(res, 401, { error: 'Invalid PIN' });
      return;
    }

    // Save encrypted config
    saveConfig(config, pin);

    // Also save calendar config to internal file for backend access
    saveInternalCalendarConfig(config);

    // Update session cache
    cacheConfigInSession(sessionId, config);

    sendJson(res, 200, { success: true }, { allowOrigin: req.headers.origin, allowCredentials: true });
  } catch (err) {
    console.error('Update config error:', err);
    const message = err instanceof Error ? err.message : 'Failed to update config';
    const statusCode = message.includes('authenticate') || message.includes('Session') ? 401 : 500;
    sendJson(res, statusCode, { error: message }, { allowOrigin: req.headers.origin, allowCredentials: true });
  }
}

/**
 * POST /api/config/factory-reset
 * Delete all data and reset to factory defaults (requires authentication + PIN)
 */
export async function handleFactoryReset(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    // Validate session
    requireAuth(req);

    // Parse request body
    const body = await parseJsonBody<FactoryResetRequest>(req);
    const { pin } = body;

    if (!pin) {
      sendJson(res, 400, { error: 'PIN required' });
      return;
    }

    // Verify PIN
    const authData = loadAuthData();
    if (!authData) {
      sendJson(res, 500, { error: 'Auth data not found' });
      return;
    }

    const pinHash = hashPin(pin, authData.salt);
    if (pinHash !== authData.pinHash) {
      sendJson(res, 401, { error: 'Invalid PIN' });
      return;
    }

    // Delete all data
    deleteConfigData();

    sendJson(res, 200, { success: true }, { allowOrigin: req.headers.origin, allowCredentials: true });
  } catch (err) {
    console.error('Factory reset error:', err);
    const message = err instanceof Error ? err.message : 'Failed to reset';
    const statusCode = message.includes('authenticate') || message.includes('Session') ? 401 : 500;
    sendJson(res, statusCode, { error: message }, { allowOrigin: req.headers.origin, allowCredentials: true });
  }
}
