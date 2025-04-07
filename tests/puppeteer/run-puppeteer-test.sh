#!/bin/bash

# Set the environment variable for Chrome developer sandbox
export CHROME_DEVEL_SANDBOX=/opt/google/chrome/chrome-sandbox

# Check if Chrome sandbox exists
if [ ! -f "$CHROME_DEVEL_SANDBOX" ]; then
  echo "Error: Chrome sandbox not found at $CHROME_DEVEL_SANDBOX"
  echo "Please make sure Google Chrome is installed."
  echo "  Option 1: Install Google Chrome"
  echo "  Option 2: Run with --no-sandbox (less secure)"
  exit 1
fi

# Make sure the development server is running
if ! curl -s http://localhost:3000 > /dev/null; then
  echo "Starting development server..."
  npm run dev &
  # Wait for server to start
  echo "Waiting for server to start..."
  sleep 5
fi

# Install puppeteer if not already installed
if ! npm list puppeteer > /dev/null 2>&1; then
  echo "Installing puppeteer..."
  npm install --save-dev puppeteer
fi

# Run the puppeteer test
echo "Running Puppeteer tests..."
# Get the project root directory (one level up from the script location)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
# Run the puppeteer test script from the correct path
node "$SCRIPT_DIR/puppeteer-test.js"
# Create screenshots directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/screenshots"
# Move any screenshots to the screenshots directory
mv -f *.png "$PROJECT_ROOT/screenshots/" 2>/dev/null || true

# Clean up
echo "Cleaning up..."
pkill -f "vite"