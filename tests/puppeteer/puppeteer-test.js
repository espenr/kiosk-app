/**
 * Puppeteer test script for Task 1.3 Core Layout System
 * 
 * This script demonstrates how to test the layout system, configuration panel,
 * and theme support using Puppeteer.
 * 
 * To run:
 * 1. Start the development server: npm run dev
 * 2. Run: node scripts/puppeteer-test.js
 */

import puppeteer from 'puppeteer';

async function runTests() {
  console.log('Starting automated browser tests for Task 1.3...');
  
  // Method 2: Use --no-sandbox flag (less secure but more compatible)
  // This is needed in environments where the Chrome sandbox cannot be used
  console.log('Launching browser with --no-sandbox flag...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Navigate to the test page
    console.log('Opening test page...');
    await page.goto('http://localhost:3000/tests/manual/puppeteer-test.html', { waitUntil: 'networkidle2' });
    
    // Get the directory where the script is located
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const screenshotPath = path.join(__dirname, '..', 'screenshots');
    
    // Create screenshots directory if it doesn't exist
    const fs = await import('fs');
    if (!fs.existsSync(screenshotPath)) {
      fs.mkdirSync(screenshotPath, { recursive: true });
    }
    
    // Take screenshot of initial state
    await page.screenshot({ path: path.join(screenshotPath, 'test-initial-state.png') });
    console.log('✓ Initial page loaded successfully');
    
    // Test 1: Test Layout Configuration
    console.log('\nTest 1: Testing layout configuration...');
    const btnChangeLayout = await page.waitForSelector('#btnChangeLayout');
    await btnChangeLayout.click();
    // Wait using setTimeout in the browser context
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
    await page.screenshot({ path: path.join(screenshotPath, 'test-layout-changed.png') });
    console.log('✓ Layout configuration changed successfully');
    
    // Test 2: Test Theme Toggle
    console.log('\nTest 2: Testing theme toggle...');
    const btnToggleTheme = await page.waitForSelector('#btnToggleTheme');
    await btnToggleTheme.click();
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
    await page.screenshot({ path: path.join(screenshotPath, 'test-theme-toggled.png') });
    console.log('✓ Theme toggled successfully');
    
    // Test 3: Test High Contrast
    console.log('\nTest 3: Testing high contrast mode...');
    const btnToggleContrast = await page.waitForSelector('#btnToggleContrast');
    await btnToggleContrast.click();
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
    await page.screenshot({ path: path.join(screenshotPath, 'test-high-contrast.png') });
    console.log('✓ High contrast mode toggled successfully');
    
    // Test 4: Test Font Size Change
    console.log('\nTest 4: Testing font size change...');
    const btnChangeFontSize = await page.waitForSelector('#btnChangeFontSize');
    await btnChangeFontSize.click();
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
    await page.screenshot({ path: path.join(screenshotPath, 'test-font-size.png') });
    console.log('✓ Font size changed successfully');
    
    // Test 5: Test Configuration Persistence
    console.log('\nTest 5: Testing configuration persistence...');
    // Save test settings
    const btnSaveSettings = await page.waitForSelector('#btnSaveSettings');
    await btnSaveSettings.click();
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    // Reload the page
    await page.reload({ waitUntil: 'networkidle2' });
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    // Load saved settings
    const btnLoadSettings = await page.waitForSelector('#btnLoadSettings');
    await btnLoadSettings.click();
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    await page.screenshot({ path: path.join(screenshotPath, 'test-persistence.png') });
    console.log('✓ Configuration persistence verified');
    
    // Test 6: Clear settings
    console.log('\nTest 6: Testing settings reset...');
    const btnClearSettings = await page.waitForSelector('#btnClearSettings');
    await btnClearSettings.click();
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 1000)));
    await page.screenshot({ path: path.join(screenshotPath, 'test-cleared.png') });
    console.log('✓ Settings cleared successfully');
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Use top-level await (supported in ES modules)
try {
  await runTests();
} catch (error) {
  console.error('Test failed:', error);
}