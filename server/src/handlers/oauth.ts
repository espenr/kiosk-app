import { IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import { requireAuth } from '../utils/http.js';
import {
  generateOAuthState,
  validateOAuthState,
  deleteOAuthState,
} from '../utils/oauth.js';
import { storeOAuthTokenInSession } from '../utils/sessions.js';

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';

/**
 * Get redirect URI based on environment
 */
function getRedirectUri(): string {
  const isDev = process.env.NODE_ENV === 'development';
  return isDev
    ? 'http://localhost:3000/admin/calendar/callback'
    : 'http://pi.local/admin/calendar/callback';
}

/**
 * POST /api/oauth/google/init
 * Initiate Google OAuth flow
 */
export async function handleInitOAuth(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    // Require authentication
    const sessionId = requireAuth(req);

    // Parse request body
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }

    const { clientId, clientSecret } = JSON.parse(body);

    // Validate credentials provided
    if (!clientId || !clientSecret) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing clientId or clientSecret' }));
      return;
    }

    // Generate OAuth state
    const state = generateOAuthState(sessionId, clientId, clientSecret);

    // Build Google OAuth URL
    const authUrl = new URL(GOOGLE_OAUTH_URL);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', getRedirectUri());
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', CALENDAR_SCOPE);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ authUrl: authUrl.toString() }));
  } catch (error) {
    console.error('[OAuth] Init error:', error);
    const statusCode = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500;
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to initiate OAuth',
      })
    );
  }
}

/**
 * GET /api/oauth/google/callback
 * Handle OAuth callback from Google
 */
export async function handleOAuthCallback(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');

    // Handle OAuth error from Google
    if (error) {
      const errorMessage = encodeURIComponent(
        error === 'access_denied' ? 'Authorization denied' : error
      );
      res.writeHead(302, {
        Location: `/admin/calendar/callback?status=error&error=${errorMessage}`,
      });
      res.end();
      return;
    }

    // Validate code and state
    if (!code || !state) {
      res.writeHead(302, {
        Location: '/admin/calendar/callback?status=error&error=Missing+code+or+state',
      });
      res.end();
      return;
    }

    // Require authentication
    const sessionId = requireAuth(req);

    // Validate OAuth state
    const oauthState = validateOAuthState(state, sessionId);
    if (!oauthState) {
      res.writeHead(302, {
        Location: '/admin/calendar/callback?status=error&error=Invalid+or+expired+state',
      });
      res.end();
      return;
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: oauthState.clientId,
        client_secret: oauthState.clientSecret,
        redirect_uri: getRedirectUri(),
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('[OAuth] Token exchange failed:', errorData);
      res.writeHead(302, {
        Location: '/admin/calendar/callback?status=error&error=Token+exchange+failed',
      });
      res.end();
      return;
    }

    const tokenData = await tokenResponse.json();
    const refreshToken = tokenData.refresh_token;

    if (!refreshToken) {
      console.error('[OAuth] No refresh token in response:', tokenData);
      res.writeHead(302, {
        Location: '/admin/calendar/callback?status=error&error=No+refresh+token+received',
      });
      res.end();
      return;
    }

    // Store refresh token in session
    storeOAuthTokenInSession(sessionId, refreshToken);

    // Delete OAuth state (one-time use)
    deleteOAuthState(state);

    // Redirect to success page
    const maskedToken = `${refreshToken.substring(0, 8)}...${refreshToken.substring(
      refreshToken.length - 4
    )}`;
    res.writeHead(302, {
      Location: `/admin/calendar/callback?status=success&refresh_token=${encodeURIComponent(
        maskedToken
      )}`,
    });
    res.end();
  } catch (error) {
    console.error('[OAuth] Callback error:', error);
    const errorMessage = encodeURIComponent(
      error instanceof Error ? error.message : 'Unknown error'
    );
    res.writeHead(302, {
      Location: `/admin/calendar/callback?status=error&error=${errorMessage}`,
    });
    res.end();
  }
}

/**
 * GET /api/oauth/google/token
 * Get OAuth token from session (for frontend to retrieve after callback)
 */
export async function handleGetOAuthToken(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  try {
    const sessionId = requireAuth(req);
    const { getOAuthTokenFromSession } = await import('../utils/sessions.js');
    const refreshToken = getOAuthTokenFromSession(sessionId);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ refreshToken }));
  } catch (error) {
    console.error('[OAuth] Get token error:', error);
    const statusCode = error instanceof Error && error.message === 'Unauthorized' ? 401 : 500;
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to get token',
      })
    );
  }
}
