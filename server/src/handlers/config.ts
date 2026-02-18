/**
 * Configuration management endpoints
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import { loadAuthData, loadConfig, saveConfig, deleteConfigData } from '../utils/storage.js';
import { hashPin } from '../utils/crypto.js';
import { getConfigFromSession, cacheConfigInSession } from '../utils/sessions.js';
import { parseJsonBody, sendJson, requireAuth } from '../utils/http.js';
import type { UpdateConfigRequest, FactoryResetRequest } from '../types.js';

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

    // Update session cache
    cacheConfigInSession(sessionId, config);

    sendJson(res, 200, { success: true }, { allowOrigin: req.headers.origin, allowCredentials: true });
  } catch (err) {
    console.error('Update config error:', err);
    const message = err instanceof Error ? err.message : 'Failed to update config';
    const statusCode = message.includes('Authentication') ? 401 : 500;
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
    const statusCode = message.includes('Authentication') ? 401 : 500;
    sendJson(res, statusCode, { error: message }, { allowOrigin: req.headers.origin, allowCredentials: true });
  }
}
