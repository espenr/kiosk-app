import crypto from 'crypto';

export interface OAuthState {
  state: string;           // 32-byte random hex
  sessionId: string;       // Authenticated session ID
  createdAt: number;       // Timestamp
  clientId: string;        // Google OAuth Client ID
  clientSecret: string;    // Google OAuth Client Secret
}

// In-memory storage for OAuth states
const oauthStates = new Map<string, OAuthState>();

// Auto-cleanup interval (5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
const STATE_EXPIRY = 10 * 60 * 1000; // 10 minutes

// Start cleanup timer
setInterval(() => {
  cleanupExpiredStates();
}, CLEANUP_INTERVAL);

/**
 * Generate a new OAuth state parameter with CSRF protection
 */
export function generateOAuthState(
  sessionId: string,
  clientId: string,
  clientSecret: string
): string {
  const state = crypto.randomBytes(32).toString('hex');

  oauthStates.set(state, {
    state,
    sessionId,
    createdAt: Date.now(),
    clientId,
    clientSecret,
  });

  return state;
}

/**
 * Validate OAuth state and return associated data
 * Returns null if state is invalid or expired
 */
export function validateOAuthState(
  state: string,
  sessionId: string
): OAuthState | null {
  const oauthState = oauthStates.get(state);

  if (!oauthState) {
    return null;
  }

  // Check if state is expired
  if (Date.now() - oauthState.createdAt > STATE_EXPIRY) {
    oauthStates.delete(state);
    return null;
  }

  // Verify session matches
  if (oauthState.sessionId !== sessionId) {
    return null;
  }

  return oauthState;
}

/**
 * Delete OAuth state after use
 */
export function deleteOAuthState(state: string): void {
  oauthStates.delete(state);
}

/**
 * Clean up expired OAuth states
 */
function cleanupExpiredStates(): void {
  const now = Date.now();
  const expiredStates: string[] = [];

  for (const [state, data] of oauthStates.entries()) {
    if (now - data.createdAt > STATE_EXPIRY) {
      expiredStates.push(state);
    }
  }

  expiredStates.forEach(state => oauthStates.delete(state));

  if (expiredStates.length > 0) {
    console.log(`[OAuth] Cleaned up ${expiredStates.length} expired states`);
  }
}
