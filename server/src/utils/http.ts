/**
 * HTTP utilities for request/response handling
 */

import { IncomingMessage, ServerResponse } from 'node:http';
import { validateSession } from './sessions.js';

const MAX_BODY_SIZE = 1024 * 1024; // 1 MB

/**
 * Parse JSON body from POST request
 * Rejects bodies larger than 1 MB
 */
export function parseJsonBody<T = unknown>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_SIZE) {
        reject(new Error('Request body too large'));
        req.destroy();
        return;
      }
      body += chunk.toString('utf-8');
    });

    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });

    req.on('error', reject);
  });
}

/**
 * Parse cookies from request headers
 */
export function parseCookies(req: IncomingMessage): Record<string, string> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return {};
  }

  const cookies: Record<string, string> = {};
  for (const cookie of cookieHeader.split(';')) {
    const [name, value] = cookie.trim().split('=');
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
  }

  return cookies;
}

/**
 * Set cookie with secure options
 */
export function setCookie(
  res: ServerResponse,
  name: string,
  value: string,
  options: {
    maxAge?: number; // seconds
    httpOnly?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
    path?: string;
  } = {}
): void {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.httpOnly !== false) {
    parts.push('HttpOnly');
  }

  if (options.sameSite) {
    parts.push(`SameSite=${options.sameSite}`);
  }

  if (options.path) {
    parts.push(`Path=${options.path}`);
  }

  const existing = res.getHeader('Set-Cookie') || [];
  const cookies = Array.isArray(existing) ? existing : [String(existing)];
  cookies.push(parts.join('; '));
  res.setHeader('Set-Cookie', cookies as string[]);
}

/**
 * Clear cookie
 */
export function clearCookie(res: ServerResponse, name: string, path: string = '/'): void {
  setCookie(res, name, '', { maxAge: 0, path });
}

/**
 * Get client IP address (respects X-Forwarded-For)
 */
export function getClientIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    return ips[0].trim();
  }

  return req.socket.remoteAddress || 'unknown';
}

/**
 * Send JSON response
 */
export function sendJson(
  res: ServerResponse,
  statusCode: number,
  data: unknown,
  options: {
    allowOrigin?: string;
    allowCredentials?: boolean;
  } = {}
): void {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
  };

  if (options.allowOrigin) {
    headers['Access-Control-Allow-Origin'] = options.allowOrigin;
  }

  if (options.allowCredentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(data));
}

/**
 * Validate authentication from session cookie
 * Returns session ID if valid, throws error otherwise
 */
export function requireAuth(req: IncomingMessage): string {
  const cookies = parseCookies(req);
  const sessionId = cookies['kiosk_session'];

  if (!sessionId) {
    throw new Error('Not authenticated');
  }

  const validSessionId = validateSession(sessionId);
  if (!validSessionId) {
    throw new Error('Session expired');
  }

  return validSessionId;
}
