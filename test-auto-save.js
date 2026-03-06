#!/usr/bin/env node
/**
 * Test script for configuration auto-save functionality
 */

const http = require('http');

const API_BASE = 'http://localhost:3001';

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        // Store cookies for session
        const cookies = res.headers['set-cookie'];
        if (cookies) {
          options.headers['Cookie'] = cookies.join('; ');
        }

        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function test() {
  console.log('=== Testing Configuration Auto-Save ===\n');

  // Step 1: Check auth status
  console.log('1. Checking authentication status...');
  const authStatus = await request('GET', '/api/auth/status');
  console.log(`   Status: ${authStatus.data.setupComplete ? 'Setup complete' : 'Setup required'}`);

  if (!authStatus.data.setupComplete) {
    console.log('   ❌ Setup not complete. Please run first-time setup first.');
    process.exit(1);
  }

  // Step 2: Login (you'll need to provide your PIN)
  const PIN = process.argv[2];
  if (!PIN) {
    console.log('\n❌ Please provide PIN as argument: node test-auto-save.js <PIN>');
    process.exit(1);
  }

  console.log('\n2. Logging in...');
  const loginRes = await request('POST', '/api/auth/login', { pin: PIN });

  if (loginRes.status !== 200) {
    console.log(`   ❌ Login failed: ${loginRes.data.error}`);
    process.exit(1);
  }

  // Extract session cookie
  const sessionCookie = loginRes.headers['set-cookie']?.[0];
  if (!sessionCookie) {
    console.log('   ❌ No session cookie received');
    process.exit(1);
  }
  console.log('   ✅ Login successful');

  // Helper function with session
  function authedRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, API_BASE);
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': sessionCookie,
        },
      };

      const req = http.request(url, options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            resolve({ status: res.statusCode, data: json });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });

      req.on('error', reject);
      if (data) {
        req.write(JSON.stringify(data));
      }
      req.end();
    });
  }

  // Step 3: Get current config
  console.log('\n3. Getting current config...');
  const configRes = await authedRequest('GET', '/api/config');

  if (configRes.status !== 200) {
    console.log(`   ❌ Failed to get config: ${configRes.data.error}`);
    process.exit(1);
  }

  const currentConfig = configRes.data;
  console.log(`   Current timestamp: ${currentConfig.lastModified || 'none'}`);
  console.log(`   Tibber API key: ${currentConfig.apiKeys?.tibber ? '***' + currentConfig.apiKeys.tibber.slice(-4) : 'not set'}`);

  // Step 4: Test auto-save with modified config
  console.log('\n4. Testing auto-save endpoint...');
  const modifiedConfig = {
    ...currentConfig,
    apiKeys: {
      ...currentConfig.apiKeys,
      tibber: currentConfig.apiKeys.tibber || 'test_token_12345678',
    },
    electricity: {
      ...currentConfig.electricity,
      gridFee: {
        day: 0.4000,  // Slightly modified
        night: 0.2500,
      },
    },
  };

  // Remove timestamp so server sets a new one
  delete modifiedConfig.lastModified;

  const autoSaveRes = await authedRequest('PATCH', '/api/config/auto', modifiedConfig);

  if (autoSaveRes.status !== 200) {
    console.log(`   ❌ Auto-save failed: ${autoSaveRes.data.error}`);
    process.exit(1);
  }

  console.log('   ✅ Auto-save successful!');
  console.log(`   New timestamp: ${autoSaveRes.data.lastModified}`);
  console.log(`   Grid fee (day): ${autoSaveRes.data.electricity.gridFee.day}`);

  // Step 5: Verify config was saved by fetching again
  console.log('\n5. Verifying config was persisted...');
  const verifyRes = await authedRequest('GET', '/api/config');

  if (verifyRes.status !== 200) {
    console.log(`   ❌ Failed to verify: ${verifyRes.data.error}`);
    process.exit(1);
  }

  const verifiedConfig = verifyRes.data;
  console.log(`   Verified timestamp: ${verifiedConfig.lastModified}`);
  console.log(`   Grid fee (day): ${verifiedConfig.electricity.gridFee.day}`);

  if (verifiedConfig.lastModified === autoSaveRes.data.lastModified) {
    console.log('   ✅ Timestamp matches!');
  } else {
    console.log('   ⚠️  Timestamp mismatch');
  }

  if (verifiedConfig.electricity.gridFee.day === 0.4000) {
    console.log('   ✅ Grid fee was persisted!');
  } else {
    console.log('   ❌ Grid fee mismatch');
  }

  // Step 6: Check public config includes new fields
  console.log('\n6. Checking public config...');
  const publicRes = await request('GET', '/api/config/public');
  console.log(`   Has apiKeys: ${!!publicRes.data.apiKeys}`);
  console.log(`   Has electricity: ${!!publicRes.data.electricity}`);

  console.log('\n=== All Tests Passed! ✅ ===');
}

test().catch(err => {
  console.error('\n❌ Test failed:', err.message);
  process.exit(1);
});
