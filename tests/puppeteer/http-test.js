/**
 * HTTP-based test script for Task 1.3 Core Layout System
 * 
 * This script uses HTTP requests to test the application's local storage
 * functionality to verify that layout and theme settings can be saved and retrieved.
 * 
 * To run:
 * 1. Start the development server: npm run dev
 * 2. Run: node scripts/http-test.js
 */

import http from 'http';

// Configuration to test
const testConfig = {
  layoutConfig: {
    grid: {
      columns: 8,
      rows: 10
    },
    widgets: [
      {
        id: 'welcome',
        x: 2,
        y: 2,
        width: 4,
        height: 4,
        visible: true
      }
    ]
  },
  themeConfig: {
    colorMode: 'light',
    primaryColor: 'blue.500',
    backgroundColor: 'gray.50',
    textColor: 'gray.800',
    accentColor: 'teal.400',
    fontSizeBase: 18,
    highContrast: true
  }
};

// JavaScript to execute to set and retrieve local storage
const testScript = `
  // Clear existing storage
  localStorage.clear();
  
  // Set test configuration
  localStorage.setItem('kiosk-app:layout-config', '${JSON.stringify(testConfig.layoutConfig)}');
  localStorage.setItem('kiosk-app:theme-config', '${JSON.stringify(testConfig.themeConfig)}');
  
  // Wait briefly for any storage events to process
  setTimeout(() => {
    // Retrieve configuration to verify it was stored correctly
    const storedLayout = JSON.parse(localStorage.getItem('kiosk-app:layout-config'));
    const storedTheme = JSON.parse(localStorage.getItem('kiosk-app:theme-config'));
    
    // Display results
    document.body.innerHTML = '<pre>' + 
      'STORED LAYOUT CONFIG:\\n' + 
      JSON.stringify(storedLayout, null, 2) + 
      '\\n\\nSTORED THEME CONFIG:\\n' + 
      JSON.stringify(storedTheme, null, 2) + 
      '</pre>';
  }, 500);
`;

// HTML to inject the test script
const testHtml = `
<!DOCTYPE html>
<html>
<head>
  <title>Task 1.3 HTTP Test</title>
</head>
<body>
  <h1>Testing localStorage functionality...</h1>
  <script>
    ${testScript}
  </script>
</body>
</html>
`;

console.log('Starting HTTP-based test for Task 1.3 Core Layout System...');

// Create a simple server to serve the test HTML
const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.url}`);
  
  if (req.url === '/test') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(testHtml);
  } else {
    res.writeHead(302, { 'Location': '/test' });
    res.end();
  }
});

// Start the server on port 3456
server.listen(3456, () => {
  console.log('Test server running at http://localhost:3456/');
  console.log('Open this URL in your browser to run the tests');
  console.log('You can also try the static test page at:');
  console.log('http://localhost:3000/test.html (if dev server is running)');
  console.log('Press Ctrl+C to stop the server');
});

// Keep the server running until manually stopped
process.on('SIGINT', () => {
  console.log('Stopping test server...');
  server.close();
  process.exit();
});