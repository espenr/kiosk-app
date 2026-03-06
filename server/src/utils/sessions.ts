/**
 * Session management for admin authentication
 *
 * Security features:
 * - In-memory session storage (cleared on server restart)
 * - 2-hour idle timeout
 * - 7-day absolute timeout
 * - Rate limiting (5 failed attempts → 5-min lockout)
 * - Automatic cleanup of expired sessions
 */

import { randomBytes } from 'node:crypto';
import type { KioskConfig } from './storage.js';

interface Session {
  id: string;
  ipAddress: string;
  createdAt: number;
  lastAccessedAt: number;
  config?: KioskConfig; // Cached decrypted config
}

interface LoginAttempt {
  count: number;
  lastAttempt: number;
  lockoutUntil?: number;
}

const sessions = new Map<string, Session>();
const loginAttempts = new Map<string, LoginAttempt>();

const SESSION_IDLE_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

/**
 * Generate cryptographically secure session ID
 */
function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create new session for authenticated user
 */
export function createSession(ipAddress: string): string {
  const sessionId = generateSessionId();
  const now = Date.now();

  sessions.set(sessionId, {
    id: sessionId,
    ipAddress,
    createdAt: now,
    lastAccessedAt: now,
  });

  return sessionId;
}

/**
 * Validate session and update last accessed time
 * Returns session ID if valid, null otherwise
 */
export function validateSession(sessionId: string): string | null {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  const now = Date.now();
  const age = now - session.createdAt;
  const idleTime = now - session.lastAccessedAt;

  // Check absolute timeout
  if (age > SESSION_MAX_AGE) {
    sessions.delete(sessionId);
    return null;
  }

  // Check idle timeout
  if (idleTime > SESSION_IDLE_TIMEOUT) {
    sessions.delete(sessionId);
    return null;
  }

  // Update last accessed time
  session.lastAccessedAt = now;
  return sessionId;
}

/**
 * Destroy session (logout)
 */
export function destroySession(sessionId: string): void {
  sessions.delete(sessionId);
}

/**
 * Cache decrypted config in session
 */
export function cacheConfigInSession(sessionId: string, config: KioskConfig): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.config = config;
  }
}

/**
 * Get cached config from session
 */
export function getConfigFromSession(sessionId: string): KioskConfig | null {
  const session = sessions.get(sessionId);
  return session?.config ?? null;
}

/**
 * Check if IP address is rate limited
 * Returns { allowed, remainingAttempts, lockoutSeconds }
 */
export function checkRateLimit(ipAddress: string): {
  allowed: boolean;
  remainingAttempts: number;
  lockoutSeconds: number;
} {
  const attempt = loginAttempts.get(ipAddress);
  if (!attempt) {
    return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS, lockoutSeconds: 0 };
  }

  const now = Date.now();

  // Check if locked out
  if (attempt.lockoutUntil && now < attempt.lockoutUntil) {
    const lockoutSeconds = Math.ceil((attempt.lockoutUntil - now) / 1000);
    return { allowed: false, remainingAttempts: 0, lockoutSeconds };
  }

  // Lockout expired, reset attempts
  if (attempt.lockoutUntil && now >= attempt.lockoutUntil) {
    loginAttempts.delete(ipAddress);
    return { allowed: true, remainingAttempts: MAX_LOGIN_ATTEMPTS, lockoutSeconds: 0 };
  }

  // Check remaining attempts
  const remainingAttempts = MAX_LOGIN_ATTEMPTS - attempt.count;
  return { allowed: remainingAttempts > 0, remainingAttempts, lockoutSeconds: 0 };
}

/**
 * Record login attempt (success or failure)
 */
export function recordLoginAttempt(ipAddress: string, success: boolean): void {
  if (success) {
    // Clear failed attempts on success
    loginAttempts.delete(ipAddress);
    return;
  }

  // Record failed attempt
  const now = Date.now();
  const attempt = loginAttempts.get(ipAddress) || { count: 0, lastAttempt: now };

  attempt.count += 1;
  attempt.lastAttempt = now;

  // Lock out after max attempts
  if (attempt.count >= MAX_LOGIN_ATTEMPTS) {
    attempt.lockoutUntil = now + LOCKOUT_DURATION;
    console.log(`IP ${ipAddress} locked out until ${new Date(attempt.lockoutUntil).toISOString()}`);
  }

  loginAttempts.set(ipAddress, attempt);
}

/**
 * Clean up expired sessions and login attempts
 */
function cleanupExpired(): void {
  const now = Date.now();

  // Clean up expired sessions
  for (const [sessionId, session] of sessions.entries()) {
    const age = now - session.createdAt;
    const idleTime = now - session.lastAccessedAt;

    if (age > SESSION_MAX_AGE || idleTime > SESSION_IDLE_TIMEOUT) {
      sessions.delete(sessionId);
    }
  }

  // Clean up expired lockouts
  for (const [ipAddress, attempt] of loginAttempts.entries()) {
    if (attempt.lockoutUntil && now >= attempt.lockoutUntil) {
      loginAttempts.delete(ipAddress);
    }
  }
}

// Start cleanup interval
setInterval(cleanupExpired, CLEANUP_INTERVAL);
