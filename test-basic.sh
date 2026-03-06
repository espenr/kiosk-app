#!/bin/bash
# Basic endpoint tests

echo "=== Testing Configuration Persistence Fix ==="
echo ""

echo "1. Testing backend health..."
HEALTH=$(curl -s http://localhost:3001/api/health)
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  echo "   ✅ Backend is healthy"
else
  echo "   ❌ Backend health check failed"
  exit 1
fi

echo ""
echo "2. Testing public config endpoint..."
PUBLIC=$(curl -s http://localhost:3001/api/config/public)
if echo "$PUBLIC" | grep -q 'location'; then
  echo "   ✅ Public config endpoint works"
  echo "   Response structure:"
  echo "$PUBLIC" | jq 'keys'
else
  echo "   ❌ Public config endpoint failed"
  exit 1
fi

echo ""
echo "3. Testing auth status..."
AUTH=$(curl -s http://localhost:3001/api/auth/status)
SETUP_COMPLETE=$(echo "$AUTH" | jq -r '.setupComplete')
if [ "$SETUP_COMPLETE" = "true" ]; then
  echo "   ✅ Setup is complete"
  echo "   To test auto-save, run: node test-auto-save.js <YOUR_PIN>"
else
  echo "   ⚠️  Setup not complete. Run first-time setup first."
fi

echo ""
echo "4. Checking if auto-save endpoint exists..."
# Try to access without auth (should return 401)
AUTOSAVE=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:3001/api/config/auto -X PATCH)
if [ "$AUTOSAVE" = "401" ]; then
  echo "   ✅ Auto-save endpoint exists (returns 401 without auth)"
else
  echo "   ⚠️  Auto-save endpoint status: $AUTOSAVE"
fi

echo ""
echo "=== Basic Tests Complete ==="
