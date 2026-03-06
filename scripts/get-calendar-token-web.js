#!/usr/bin/env node
/**
 * Google Calendar OAuth Token Generator (Web Flow)
 *
 * This script:
 * 1. Starts a local web server on port 8080
 * 2. Opens your browser to Google OAuth
 * 3. Handles the callback automatically
 * 4. Displays your refresh token
 *
 * Much easier than the device code flow!
 */

import http from 'node:http';
import { URL } from 'node:url';
import { exec } from 'node:child_process';
import { createInterface } from 'node:readline';

// Configuration
const PORT = 8080;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

// ANSI colors
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';

// Get credentials from environment or prompt
let clientId = process.env.GOOGLE_CLIENT_ID;
let clientSecret = process.env.GOOGLE_CLIENT_SECRET;

// If not in environment, prompt user
if (!clientId || !clientSecret) {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  (async () => {
    console.log(`\n${BOLD}=== Google Calendar OAuth Token Generator ===${RESET}\n`);

    if (!clientId) {
      clientId = await question('Enter Google OAuth Client ID: ');
    }
    if (!clientSecret) {
      clientSecret = await question('Enter Google OAuth Client Secret: ');
    }

    rl.close();
    startOAuthFlow();
  })();
} else {
  startOAuthFlow();
}

function startOAuthFlow() {
  console.log(`\n${BOLD}=== Google Calendar OAuth Token Generator ===${RESET}\n`);
  console.log(`${BLUE}Starting local server on port ${PORT}...${RESET}\n`);

  let server;
  let serverClosed = false;

  // Create HTTP server to handle OAuth callback
  server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    // Handle OAuth callback
    if (url.pathname === '/callback') {
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: sans-serif; padding: 40px; text-align: center;">
              <h1 style="color: #d32f2f;">❌ Authorization Failed</h1>
              <p>Error: ${error}</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        console.error(`\n${RED}❌ Authorization failed: ${error}${RESET}\n`);
        if (!serverClosed) {
          serverClosed = true;
          server.close();
          process.exit(1);
        }
        return;
      }

      if (!code) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: sans-serif; padding: 40px; text-align: center;">
              <h1 style="color: #d32f2f;">❌ Missing Authorization Code</h1>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        console.error(`\n${RED}❌ No authorization code received${RESET}\n`);
        if (!serverClosed) {
          serverClosed = true;
          server.close();
          process.exit(1);
        }
        return;
      }

      // Exchange code for tokens
      try {
        console.log(`${BLUE}📥 Received authorization code, exchanging for tokens...${RESET}`);

        const tokenResponse = await fetch(TOKEN_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          throw new Error(`Token exchange failed: ${errorText}`);
        }

        const tokens = await tokenResponse.json();
        const refreshToken = tokens.refresh_token;

        if (!refreshToken) {
          throw new Error('No refresh token in response');
        }

        // Send success page to browser
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: sans-serif; padding: 40px; text-align: center;">
              <h1 style="color: #4caf50;">✅ Authorization Successful!</h1>
              <p style="font-size: 18px;">Your refresh token has been generated.</p>
              <p style="color: #666;">Check your terminal for the token.</p>
              <p style="margin-top: 40px; color: #999;">You can close this window.</p>
            </body>
          </html>
        `);

        // Display refresh token in terminal
        console.log(`\n${GREEN}${BOLD}✅ SUCCESS!${RESET}\n`);
        console.log(`${BOLD}Your Google Calendar Refresh Token:${RESET}`);
        console.log(`${YELLOW}${refreshToken}${RESET}\n`);
        console.log(`${BOLD}Next Steps:${RESET}`);
        console.log(`1. Go to ${BLUE}http://pi.local/admin/settings${RESET}`);
        console.log(`2. Scroll to "Google Calendar" section`);
        console.log(`3. Enter your Client ID, Client Secret, and this Refresh Token`);
        console.log(`4. Add your calendar sources (e.g., "primary" for main calendar)`);
        console.log(`5. Save settings\n`);

        // Close server after a short delay
        setTimeout(() => {
          if (!serverClosed) {
            serverClosed = true;
            server.close(() => {
              process.exit(0);
            });
          }
        }, 1000);

      } catch (err) {
        console.error(`\n${RED}❌ Error exchanging code for token:${RESET}`, err.message);
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <body style="font-family: sans-serif; padding: 40px; text-align: center;">
              <h1 style="color: #d32f2f;">❌ Token Exchange Failed</h1>
              <p>${err.message}</p>
              <p>You can close this window.</p>
            </body>
          </html>
        `);
        if (!serverClosed) {
          serverClosed = true;
          server.close(() => {
            process.exit(1);
          });
        }
      }
      return;
    }

    // Default handler
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
  });

  server.listen(PORT, () => {
    // Build OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPE);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    const authUrlString = authUrl.toString();

    console.log(`${GREEN}✓${RESET} Server started on ${BLUE}http://localhost:${PORT}${RESET}\n`);
    console.log(`${BOLD}Opening browser for authorization...${RESET}`);
    console.log(`\nIf browser doesn't open automatically, visit:\n${BLUE}${authUrlString}${RESET}\n`);
    console.log(`${YELLOW}Waiting for authorization...${RESET}\n`);

    // Open browser
    const openCommand = process.platform === 'darwin' ? 'open' :
                       process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${openCommand} "${authUrlString}"`, (error) => {
      if (error) {
        console.error(`${RED}Could not open browser automatically${RESET}`);
        console.log(`Please open this URL manually:\n${authUrlString}\n`);
      }
    });
  });

  // Handle server errors
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n${RED}❌ Port ${PORT} is already in use${RESET}`);
      console.log(`Try closing other applications or use a different port.\n`);
    } else {
      console.error(`\n${RED}❌ Server error:${RESET}`, err.message);
    }
    process.exit(1);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log(`\n\n${YELLOW}⚠ Authorization cancelled${RESET}\n`);
    if (!serverClosed) {
      serverClosed = true;
      server.close(() => {
        process.exit(0);
      });
    }
  });
}
