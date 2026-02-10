#!/bin/bash

# Get the project root directory (one level up from the script location)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Create screenshots directory if it doesn't exist
mkdir -p "$PROJECT_ROOT/screenshots"

# Set the environment variable for Chrome developer sandbox
export CHROME_DEVEL_SANDBOX=/opt/google/chrome/chrome-sandbox

# Check if Chrome sandbox exists
if [ ! -f "$CHROME_DEVEL_SANDBOX" ]; then
  echo "Warning: Chrome sandbox not found at $CHROME_DEVEL_SANDBOX"
  echo "Will run with --no-sandbox flag (less secure but works without Chrome installed)"
fi

# Make sure the development server is running
SERVER_STARTED=false
if ! curl -s http://localhost:3000 > /dev/null; then
  echo "Starting development server..."
  npm run dev &
  SERVER_PID=$!
  # Wait for server to start
  echo "Waiting for server to start..."
  while ! curl -s http://localhost:3000 > /dev/null; do
    sleep 1
  done
  echo "Server started!"
  SERVER_STARTED=true
else
  echo "Development server already running"
fi

# Install puppeteer if not already installed
if ! npm list puppeteer > /dev/null 2>&1; then
  echo "Installing puppeteer..."
  npm install --save-dev puppeteer
fi

# Display menu of available tests
echo ""
echo "Available Tests:"
echo "1) Basic App Test (original)"
echo "2) Clock Widget Test"
echo "3) Simple Clock Test (debugging)"
echo "4) Run All Tests"
echo ""
read -p "Select a test to run (1-4): " test_selection

run_original_test() {
  echo "Running original Puppeteer tests..."
  node "$SCRIPT_DIR/puppeteer-test.js"
  # Move any screenshots to the screenshots directory
  mv -f *.png "$PROJECT_ROOT/screenshots/" 2>/dev/null || true
}

run_clock_test() {
  echo "Running Clock Widget tests..."
  node "$SCRIPT_DIR/clock-widget-test.js"
  # Move any screenshots to the screenshots directory
  mv -f *.png "$PROJECT_ROOT/screenshots/" 2>/dev/null || true
}

run_simple_clock_test() {
  echo "Running Simple Clock Debug test..."
  node "$SCRIPT_DIR/clock-simple-test.js"
  # Move any screenshots to the screenshots directory
  mv -f *.png "$PROJECT_ROOT/screenshots/" 2>/dev/null || true
}

# Run the selected test
case $test_selection in
  1)
    run_original_test
    ;;
  2)
    run_clock_test
    ;;
  3)
    run_simple_clock_test
    ;;
  4)
    run_original_test
    run_clock_test
    ;;
  *)
    echo "Invalid selection. Exiting."
    ;;
esac

# Clean up if we started the server
if [ "$SERVER_STARTED" = true ]; then
  echo "Stopping development server..."
  kill $SERVER_PID
fi

echo "Tests completed. Check the screenshots folder for results."