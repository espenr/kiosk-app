#!/usr/bin/env node
/**
 * Test OAuth URL generation
 * Shows you the exact URL being sent to Google
 */

import { createInterface } from 'node:readline';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

console.log('\n=== OAuth URL Test ===\n');

const clientId = await question('Enter Google OAuth Client ID: ');

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', 'http://localhost:8080/callback');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/calendar.readonly');
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');

console.log('\n=== Generated OAuth URL ===\n');
console.log(authUrl.toString());
console.log('\n=== Required Redirect URI ===\n');
console.log('http://localhost:8080/callback');
console.log('\nMake sure this EXACT redirect URI is added to your OAuth client in Google Cloud Console.\n');

rl.close();
process.exit(0);
