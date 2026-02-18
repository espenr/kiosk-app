/**
 * Authentication endpoints
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import {
  loadAuthData,
  saveAuthData,
  loadConfig,
  saveConfig,
  deleteConfigData,
  type AuthData,
  type KioskConfig,
} from '../utils/storage.js';
import { hashPin, generateCode, generateSalt } from '../utils/crypto.js';
import {
  createSession,
  destroySession,
  checkRateLimit,
  recordLoginAttempt,
  cacheConfigInSession,
} from '../utils/sessions.js';
import { parseJsonBody, sendJson, setCookie, clearCookie, parseCookies, getClientIp } from '../utils/http.js';
import type {
  AuthStatusResponse,
  LoginRequest,
  CompleteSetupRequest,
  FactoryResetRequest,
} from '../types.js';

const FIRST_TIME_CODE_EXPIRY = 15 * 60 * 1000; // 15 minutes
const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days (in seconds)

/**
 * GET /api/auth/status
 * Check setup and authentication status
 */
export function handleAuthStatus(req: IncomingMessage, res: ServerResponse): void {
  const authData = loadAuthData();
  const cookies = parseCookies(req);
  const sessionId = cookies['kiosk_session'];

  // Not set up yet
  if (!authData || !authData.setupComplete) {
    const response: AuthStatusResponse = {
      setupComplete: false,
      requiresFirstTimeCode: !!authData?.firstTimeCode,
      firstTimeCode: authData?.firstTimeCode,
      codeExpired: authData?.firstTimeCodeExpiry ? Date.now() > authData.firstTimeCodeExpiry : false,
    };
    sendJson(res, 200, response, { allowOrigin: req.headers.origin, allowCredentials: true });
    return;
  }

  // Setup complete, check authentication
  const response: AuthStatusResponse = {
    setupComplete: true,
    authenticated: !!sessionId,
  };
  sendJson(res, 200, response, { allowOrigin: req.headers.origin, allowCredentials: true });
}

/**
 * POST /api/auth/init-setup
 * Generate first-time setup code for TV display
 */
export async function handleInitSetup(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const authData = loadAuthData();

  // Already set up
  if (authData?.setupComplete) {
    sendJson(res, 400, { error: 'Setup already complete' });
    return;
  }

  // Generate 6-char code
  const code = generateCode(6);
  const expiry = Date.now() + FIRST_TIME_CODE_EXPIRY;

  const newAuthData: AuthData = {
    pinHash: '',
    salt: '',
    setupComplete: false,
    firstTimeCode: code,
    firstTimeCodeExpiry: expiry,
  };

  saveAuthData(newAuthData);

  sendJson(res, 200, {
    firstTimeCode: code,
    expiresIn: FIRST_TIME_CODE_EXPIRY / 1000, // seconds
  });
}

/**
 * POST /api/auth/complete-setup
 * Complete first-time setup with code + PIN + config
 */
export async function handleCompleteSetup(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await parseJsonBody<CompleteSetupRequest>(req);
    const { code, pin, config } = body;

    if (!code || !pin || !config) {
      sendJson(res, 400, { error: 'Missing required fields' });
      return;
    }

    // Validate PIN format (4-8 digits)
    if (!/^\d{4,8}$/.test(pin)) {
      sendJson(res, 400, { error: 'PIN must be 4-8 digits' });
      return;
    }

    const authData = loadAuthData();

    // Check setup state
    if (!authData || authData.setupComplete) {
      sendJson(res, 400, { error: 'Setup already complete or not initialized' });
      return;
    }

    // Validate code
    if (authData.firstTimeCode !== code) {
      sendJson(res, 401, { error: 'Invalid setup code' });
      return;
    }

    // Check code expiry
    if (authData.firstTimeCodeExpiry && Date.now() > authData.firstTimeCodeExpiry) {
      sendJson(res, 401, { error: 'Setup code expired' });
      return;
    }

    // Generate salt and hash PIN
    const salt = generateSalt();
    const pinHash = hashPin(pin, salt);

    // Save auth data
    const newAuthData: AuthData = {
      pinHash,
      salt,
      setupComplete: true,
    };
    saveAuthData(newAuthData);

    // Save encrypted config
    saveConfig(config, pin);

    // Create session
    const ipAddress = getClientIp(req);
    const sessionId = createSession(ipAddress);
    cacheConfigInSession(sessionId, config);

    // Set session cookie
    setCookie(res, 'kiosk_session', sessionId, {
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
      sameSite: 'Strict',
      path: '/',
    });

    sendJson(res, 200, { success: true }, { allowOrigin: req.headers.origin, allowCredentials: true });
  } catch (err) {
    console.error('Setup error:', err);
    sendJson(res, 500, { error: 'Setup failed' });
  }
}

/**
 * POST /api/auth/login
 * Authenticate with PIN
 */
export async function handleLogin(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const body = await parseJsonBody<LoginRequest>(req);
    const { pin } = body;

    if (!pin) {
      sendJson(res, 400, { error: 'PIN required' });
      return;
    }

    const authData = loadAuthData();
    if (!authData || !authData.setupComplete) {
      sendJson(res, 400, { error: 'Setup not complete' });
      return;
    }

    // Check rate limiting
    const ipAddress = getClientIp(req);
    const rateLimit = checkRateLimit(ipAddress);

    if (!rateLimit.allowed) {
      sendJson(res, 429, {
        error: 'Too many failed attempts',
        lockoutSeconds: rateLimit.lockoutSeconds,
      });
      return;
    }

    // Verify PIN
    const pinHash = hashPin(pin, authData.salt);
    if (pinHash !== authData.pinHash) {
      recordLoginAttempt(ipAddress, false);
      const newRateLimit = checkRateLimit(ipAddress);
      sendJson(res, 401, {
        error: 'Invalid PIN',
        remainingAttempts: newRateLimit.remainingAttempts,
      });
      return;
    }

    // PIN correct - clear rate limit
    recordLoginAttempt(ipAddress, true);

    // Load and cache config
    const config = loadConfig(pin);
    if (!config) {
      sendJson(res, 500, { error: 'Failed to load config' });
      return;
    }

    // Create session
    const sessionId = createSession(ipAddress);
    cacheConfigInSession(sessionId, config);

    // Set session cookie
    setCookie(res, 'kiosk_session', sessionId, {
      maxAge: SESSION_MAX_AGE,
      httpOnly: true,
      sameSite: 'Strict',
      path: '/',
    });

    sendJson(res, 200, { success: true }, { allowOrigin: req.headers.origin, allowCredentials: true });
  } catch (err) {
    console.error('Login error:', err);
    sendJson(res, 500, { error: 'Login failed' });
  }
}

/**
 * POST /api/auth/logout
 * Destroy session
 */
export function handleLogout(req: IncomingMessage, res: ServerResponse): void {
  const cookies = parseCookies(req);
  const sessionId = cookies['kiosk_session'];

  if (sessionId) {
    destroySession(sessionId);
  }

  clearCookie(res, 'kiosk_session', '/');
  sendJson(res, 200, { success: true }, { allowOrigin: req.headers.origin, allowCredentials: true });
}
