/**
 * Start the development server and run the tests
 */

import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';

// Start the development server
console.log('Starting the development server...');
const server = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit'
});

// Wait for the server to start
console.log('Waiting for the server to start (5 seconds)...');
await sleep(5000);

// Now run one of the test methods
console.log('\nTesting options:');
console.log('1. Browser-based test (manual):');
console.log('   Open http://localhost:3000/tests/manual/puppeteer-test.html in your browser');
console.log('   Or http://localhost:3000/tests/manual/test.html');
console.log('\n2. HTTP test server:');
console.log('   Run: node tests/puppeteer/http-test.js');
console.log('   Then open http://localhost:3456/ in your browser');
console.log('\n3. Puppeteer test:');
console.log('   Run: node tests/puppeteer/puppeteer-test.js');
console.log('   Or: npm test');
console.log('\nServer is running at http://localhost:3000/');
console.log('Press Ctrl+C to stop the server');

// Keep the server running until the script is terminated
process.on('SIGINT', () => {
  console.log('\nStopping the development server...');
  server.kill('SIGINT');
  process.exit();
});

// Keep the process alive
await new Promise(() => {});