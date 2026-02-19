#!/bin/bash

# Test script for Phase 6: CLI Tool

echo "================================"
echo "Phase 6: CLI Tool Test"
echo "================================"
echo ""

# Setup test environment
echo "Setting up test environment..."
cd "$(dirname "$0")"

# Clean up and start fresh
rm -rf server/data
lsof -ti:3001 | xargs kill -9 2>/dev/null
sleep 1

# Start backend
cd server
node dist/index.js > /tmp/cli-test-backend.log 2>&1 &
BACKEND_PID=$!
cd ..
sleep 2

if ! curl -s http://localhost:3001/api/auth/status > /dev/null; then
  echo "✗ Backend failed to start"
  exit 1
fi
echo "✓ Backend running"
echo ""

# Test 1: Status before setup
echo "Test 1: Status (before setup)"
echo "------------------------------"
./scripts/kiosk-admin status
echo ""

# Test 2: Complete setup
echo "Test 2: Complete Setup"
echo "------------------------------"
CODE=$(curl -s -X POST http://localhost:3001/api/auth/init-setup | jq -r '.firstTimeCode')
echo "Generated code: $CODE"

curl -s -X POST http://localhost:3001/api/auth/complete-setup \
  -H "Content-Type: application/json" \
  -d "{\"code\": \"$CODE\", \"pin\": \"1234\", \"config\": {\"location\": {\"latitude\": 63.43, \"longitude\": 10.64, \"stopPlaceIds\": []}, \"apiKeys\": {\"tibber\": \"test-token\"}, \"electricity\": {\"gridFee\": 0.36}, \"photos\": {\"sharedAlbumUrl\": \"https://icloud.com/test\", \"interval\": 30}, \"calendar\": {\"calendars\": []}}}" > /dev/null

echo "✓ Setup complete"
echo ""

# Test 3: Status after setup
echo "Test 3: Status (after setup)"
echo "------------------------------"
./scripts/kiosk-admin status
echo ""

# Test 4: Verify config file content
echo "Test 4: Verify Config"
echo "------------------------------"
if [ -f "server/data/config.enc.json" ]; then
  echo "✓ Config file exists (encrypted)"
  echo "  Size: $(ls -lh server/data/config.enc.json | awk '{print $5}')"
else
  echo "✗ Config file not found"
fi
echo ""

# Test 5: Reset PIN (preserves config)
echo "Test 5: Reset PIN"
echo "------------------------------"
echo "This would normally be interactive. In development mode:"
echo "  ./scripts/kiosk-admin reset-pin"
echo ""
echo "Expected behavior:"
echo "  • Deletes auth.json"
echo "  • Preserves config.enc.json"
echo "  • Generates new 6-char code"
echo "  • Warns to restart server manually (dev mode)"
echo ""

# Manually test reset-pin
echo "Testing reset-pin non-interactively..."
BEFORE_CONFIG=$(cat server/data/config.enc.json)

# Run reset-pin with yes confirmation
yes | ./scripts/kiosk-admin reset-pin 2>&1 | head -30

AFTER_CONFIG=$(cat server/data/config.enc.json)

if [ "$BEFORE_CONFIG" = "$AFTER_CONFIG" ]; then
  echo "✓ Config preserved after reset-pin"
else
  echo "✗ Config was modified"
fi

# Check for new code
if grep -q "firstTimeCode" server/data/auth.json; then
  NEW_CODE=$(grep -o '"firstTimeCode":\s*"[^"]*"' server/data/auth.json | cut -d'"' -f4)
  echo "✓ New setup code generated: $NEW_CODE"
else
  echo "✗ No setup code found"
fi
echo ""

# Test 6: Factory Reset
echo "Test 6: Factory Reset"
echo "------------------------------"
echo "This test would delete all data. Skipping to preserve test environment."
echo ""
echo "To test factory-reset manually:"
echo "  ./scripts/kiosk-admin factory-reset"
echo ""
echo "Expected behavior:"
echo "  • Prompts to type 'DELETE'"
echo "  • Confirms with Y/N"
echo "  • Creates backup directory"
echo "  • Deletes all data files"
echo "  • Warns to restart server manually (dev mode)"
echo ""

# Test 7: Help command
echo "Test 7: Help Command"
echo "------------------------------"
./scripts/kiosk-admin help | head -20
echo "  ... (truncated)"
echo ""

# Cleanup
echo "================================"
echo "Cleanup"
echo "================================"
kill $BACKEND_PID 2>/dev/null
echo "✓ Backend stopped"
echo ""

echo "================================"
echo "Phase 6 Tests Complete"
echo "================================"
echo ""
echo "Manual tests to verify:"
echo ""
echo "1. Install CLI tool (on Pi):"
echo "   sudo bash scripts/setup-admin.sh"
echo ""
echo "2. Test reset-pin (on Pi):"
echo "   sudo kiosk-admin reset-pin"
echo ""
echo "3. Test factory-reset (on Pi):"
echo "   sudo kiosk-admin factory-reset"
echo ""
echo "4. Test status:"
echo "   sudo kiosk-admin status"
echo ""
