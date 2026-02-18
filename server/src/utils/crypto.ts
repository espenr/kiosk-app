/**
 * Cryptography utilities for PIN-based authentication and config encryption
 *
 * Security design:
 * - Machine secret (32 bytes) combined with user PIN for key derivation
 * - AES-256-GCM for config encryption
 * - Scrypt for key derivation (memory-hard, resistant to GPU attacks)
 * - PIN hash stored separately (no machine secret) for verification
 */

import { randomBytes, scryptSync, createCipheriv, createDecipheriv } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MACHINE_SECRET_PATH = join(__dirname, '..', '..', 'data', 'machine.secret');

const SCRYPT_N = 16384; // CPU/memory cost (2^14)
const SCRYPT_R = 8; // Block size
const SCRYPT_P = 1; // Parallelization
const KEY_LENGTH = 32; // 256 bits for AES-256

/**
 * Load or generate machine secret (32 random bytes)
 * This secret is combined with user PIN for key derivation
 * File permissions: 0o600 (read/write owner only)
 */
export function getMachineSecret(): Buffer {
  if (existsSync(MACHINE_SECRET_PATH)) {
    return readFileSync(MACHINE_SECRET_PATH);
  }

  return generateMachineSecret();
}

/**
 * Generate new machine secret and save to disk
 */
export function generateMachineSecret(): Buffer {
  const secret = randomBytes(32);
  writeFileSync(MACHINE_SECRET_PATH, secret, { mode: 0o600 });
  chmodSync(MACHINE_SECRET_PATH, 0o600); // Ensure permissions
  console.log('Generated new machine secret');
  return secret;
}

/**
 * Generate cryptographically random salt (32 bytes)
 */
export function generateSalt(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate alphanumeric code (excludes ambiguous chars: 0, O, I, l)
 */
export function generateCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[randomBytes(1)[0] % chars.length];
  }
  return code;
}

/**
 * Derive encryption key from PIN and salt using machine secret
 * Machine secret ensures keys can't be derived without access to the Pi
 */
export function deriveKey(pin: string, salt: string): Buffer {
  const machineSecret = getMachineSecret();
  const input = Buffer.concat([Buffer.from(pin, 'utf-8'), machineSecret]);
  return scryptSync(input, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
}

/**
 * Hash PIN for verification (without machine secret)
 * This allows PIN verification without needing to decrypt config
 */
export function hashPin(pin: string, salt: string): string {
  const hash = scryptSync(pin, salt, 32, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return hash.toString('hex');
}

/**
 * Encrypt data using AES-256-GCM
 * Returns: iv:authTag:ciphertext (all hex-encoded)
 */
export function encrypt(data: string, pin: string, salt: string): string {
  const key = deriveKey(pin, salt);
  const iv = randomBytes(16); // 128-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(data, 'utf-8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypt data using AES-256-GCM
 * Input format: iv:authTag:ciphertext (all hex-encoded)
 * Throws on authentication failure (wrong PIN or tampered data)
 */
export function decrypt(encryptedData: string, pin: string, salt: string): string {
  const [ivHex, authTagHex, ciphertext] = encryptedData.split(':');
  if (!ivHex || !authTagHex || !ciphertext) {
    throw new Error('Invalid encrypted data format');
  }

  const key = deriveKey(pin, salt);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');

  return decrypted;
}
