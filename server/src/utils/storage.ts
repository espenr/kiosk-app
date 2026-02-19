/**
 * Storage utilities for encrypted config and auth data
 *
 * Files:
 * - data/auth.json: Plain text auth metadata (PIN hash, salt, setup state)
 * - data/config.enc.json: Encrypted config (requires PIN to decrypt)
 * - data/machine.secret: Machine-specific secret (0o600 permissions)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encrypt, decrypt } from './crypto.js';
import type { KioskConfig, AuthData, PublicConfig } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'data');
const AUTH_FILE = join(DATA_DIR, 'auth.json');
const CONFIG_FILE = join(DATA_DIR, 'config.enc.json');
const PUBLIC_CONFIG_FILE = join(DATA_DIR, 'config.public.json');

// Re-export types for convenience
export type { AuthData, KioskConfig, PublicConfig };

/**
 * Ensure data directory exists with secure permissions
 */
export function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
    console.log('Created data directory');
  }
}

/**
 * Load auth metadata from disk
 * Returns null if file doesn't exist (first-time setup)
 */
export function loadAuthData(): AuthData | null {
  ensureDataDir();

  if (!existsSync(AUTH_FILE)) {
    return null;
  }

  try {
    const content = readFileSync(AUTH_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Failed to load auth data:', err);
    return null;
  }
}

/**
 * Save auth metadata to disk
 * File permissions: 0o600 (read/write owner only)
 */
export function saveAuthData(authData: AuthData): void {
  ensureDataDir();

  const content = JSON.stringify(authData, null, 2);
  writeFileSync(AUTH_FILE, content, { mode: 0o600 });
  chmodSync(AUTH_FILE, 0o600); // Ensure permissions
}

/**
 * Load and decrypt config from disk
 * Returns null if file doesn't exist
 * Throws on decryption failure (wrong PIN)
 */
export function loadConfig(pin: string): KioskConfig | null {
  ensureDataDir();

  if (!existsSync(CONFIG_FILE)) {
    return null;
  }

  const authData = loadAuthData();
  if (!authData) {
    throw new Error('Auth data not found');
  }

  try {
    const encryptedContent = readFileSync(CONFIG_FILE, 'utf-8');
    const decryptedContent = decrypt(encryptedContent, pin, authData.salt);
    return JSON.parse(decryptedContent);
  } catch (err) {
    console.error('Failed to decrypt config:', err);
    throw new Error('Failed to decrypt config (wrong PIN?)');
  }
}

/**
 * Encrypt and save config to disk
 * File permissions: 0o600 (read/write owner only)
 */
export function saveConfig(config: KioskConfig, pin: string): void {
  ensureDataDir();

  const authData = loadAuthData();
  if (!authData) {
    throw new Error('Auth data not found');
  }

  const content = JSON.stringify(config, null, 2);
  const encrypted = encrypt(content, pin, authData.salt);

  writeFileSync(CONFIG_FILE, encrypted, { mode: 0o600 });
  chmodSync(CONFIG_FILE, 0o600); // Ensure permissions

  // Also save public config (unencrypted, non-sensitive data)
  savePublicConfig(config);
}

/**
 * Extract and save public config from full config
 * Public config contains only non-sensitive data that can be exposed without auth
 */
export function savePublicConfig(config: KioskConfig): void {
  ensureDataDir();

  const publicConfig: PublicConfig = {
    location: config.location,
    photos: {
      interval: config.photos.interval,
    },
    calendar: {
      clientId: config.calendar.clientId, // OAuth Client ID is public
    },
  };

  const content = JSON.stringify(publicConfig, null, 2);
  writeFileSync(PUBLIC_CONFIG_FILE, content, { mode: 0o644 }); // Readable by all
}

/**
 * Load public config from disk
 * Returns null if file doesn't exist
 */
export function loadPublicConfig(): PublicConfig | null {
  ensureDataDir();

  if (!existsSync(PUBLIC_CONFIG_FILE)) {
    return null;
  }

  try {
    const content = readFileSync(PUBLIC_CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Failed to load public config:', err);
    return null;
  }
}

/**
 * Delete all config and auth data (factory reset)
 */
export function deleteConfigData(): void {
  const files = [AUTH_FILE, CONFIG_FILE, PUBLIC_CONFIG_FILE];

  for (const file of files) {
    if (existsSync(file)) {
      unlinkSync(file);
      console.log(`Deleted: ${file}`);
    }
  }
}

/**
 * Check if setup is complete
 */
export function isSetupComplete(): boolean {
  const authData = loadAuthData();
  return authData?.setupComplete ?? false;
}
