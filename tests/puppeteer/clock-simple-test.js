/**
 * Simple test script for the Clock Widget
 * Run with: node tests/puppeteer/clock-simple-test.js
 */

import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get the current file's directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup screenshot path
const screenshotPath = path.join(__dirname, '..', 'screenshots');

// Create screenshots directory if it doesn't exist
if (!fs.existsSync(screenshotPath)) {
  fs.mkdirSync(screenshotPath, { recursive: true });
}

(async () => {
  console.log('Starting simple Clock Widget test...');
  
  // Launch browser with visible UI for debugging
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    console.log('Loading application...');
    
    // Set up console logging from the page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
    
    // Take initial screenshot
    await page.screenshot({ path: path.join(screenshotPath, 'simple-test-initial.png') });
    console.log('Captured initial screenshot');
    
    // Wait a moment then take another screenshot 
    console.log('Waiting 5 seconds to see if clock updates...');
    // Use setTimeout as an alternative to page.waitForTimeout
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 5000)));
    
    await page.screenshot({ path: path.join(screenshotPath, 'simple-test-after-wait.png') });
    console.log('Captured screenshot after waiting');
    
    // Print info about page elements
    console.log('Analyzing page structure...');
    
    // Count all elements
    const totalElements = await page.evaluate(() => document.querySelectorAll('*').length);
    console.log(`Total elements on page: ${totalElements}`);
    
    // Look for any text nodes that might be the time
    const timeElements = await page.evaluate(() => {
      // Look for elements that might contain time (looking for patterns like 00:00 or 0:00)
      const timeRegex = /\d{1,2}:\d{2}/;
      const allElements = Array.from(document.querySelectorAll('*'));
      
      return allElements
        .filter(el => el.textContent && timeRegex.test(el.textContent))
        .map(el => ({
          tagName: el.tagName,
          textContent: el.textContent.trim(),
          className: el.className,
          id: el.id
        }));
    });
    
    console.log('Potential clock elements found:', timeElements);
    
    console.log('Simple test completed');
    
  } catch (error) {
    console.error('Test failed:', error);
    
    // Take screenshot on failure
    await page.screenshot({ path: path.join(screenshotPath, 'simple-test-error.png') });
    console.log('Error screenshot saved');
    
  } finally {
    // Keep the browser open for manual inspection
    console.log('Keeping browser open for inspection. Press Ctrl+C to exit when done.');
    
    // Uncomment this line if you want the browser to close automatically
    // await browser.close();
  }
})();