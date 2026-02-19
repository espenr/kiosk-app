#!/bin/bash
# Phase 7 Integration Testing Script
# Tests server-side config sync with ConfigContext

set -e

API="http://localhost:3001/api"
COOKIES="/tmp/kiosk-cookies.txt"

echo "==================================="
echo "Phase 7 Integration Testing"
echo "==================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

test_pass() {
    echo -e "${GREEN}✓ $1${NC}"
}

test_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Test 1: Initial Auth Status
test_step "Test 1: Check initial auth status"
STATUS=$(curl -s $API/auth/status)
echo "$STATUS" | jq .
if [[ $(echo "$STATUS" | jq -r .setupComplete) == "false" ]]; then
    test_pass "Setup not complete (as expected)"
else
    test_info "Setup already complete - skipping setup tests"
fi
echo ""

# Test 2: Generate First-Time Code
test_step "Test 2: Generate first-time setup code"
INIT_RESPONSE=$(curl -s -X POST $API/auth/init-setup)
CODE=$(echo "$INIT_RESPONSE" | jq -r .firstTimeCode)
EXPIRES_IN=$(echo "$INIT_RESPONSE" | jq -r .expiresIn)

if [ "$CODE" != "null" ] && [ ! -z "$CODE" ]; then
    test_pass "Code generated: $CODE"
    test_info "Expires in: $EXPIRES_IN seconds"
else
    echo "❌ Failed to generate code"
    exit 1
fi
echo ""

# Test 3: Complete Setup
test_step "Test 3: Complete setup with code and PIN"
CONFIG='{
  "location": {
    "latitude": 60.0,
    "longitude": 11.0,
    "stopPlaceIds": []
  },
  "apiKeys": {
    "tibber": "test-token-123"
  },
  "electricity": {
    "gridFee": 0.40
  },
  "photos": {
    "sharedAlbumUrl": "",
    "interval": 30
  },
  "calendar": {
    "calendars": []
  }
}'

SETUP_RESPONSE=$(curl -s -X POST $API/auth/complete-setup \
  -c $COOKIES \
  -H "Content-Type: application/json" \
  -d "{
    \"code\": \"$CODE\",
    \"pin\": \"1234\",
    \"config\": $CONFIG
  }")

echo "$SETUP_RESPONSE" | jq .

if [[ $(echo "$SETUP_RESPONSE" | jq -r .success) == "true" ]]; then
    test_pass "Setup completed successfully"
    test_info "Session cookie saved to $COOKIES"
else
    echo "❌ Setup failed"
    echo "$SETUP_RESPONSE"
    exit 1
fi
echo ""

# Test 4: Get Config (with session)
test_step "Test 4: Retrieve config from server"
GET_CONFIG=$(curl -s $API/config -b $COOKIES)
echo "$GET_CONFIG" | jq .

LAT=$(echo "$GET_CONFIG" | jq -r .location.latitude)
GRIDFEE=$(echo "$GET_CONFIG" | jq -r .electricity.gridFee)
TIBBER=$(echo "$GET_CONFIG" | jq -r .apiKeys.tibber)

if [ "$LAT" == "60" ] && [ "$GRIDFEE" == "0.4" ] && [ "$TIBBER" == "test-token-123" ]; then
    test_pass "Config retrieved successfully"
    test_info "Latitude: $LAT, Grid Fee: $GRIDFEE kr/kWh, Tibber: $TIBBER"
else
    echo "❌ Config values don't match"
    exit 1
fi
echo ""

# Test 5: Update Config
test_step "Test 5: Update config with new values"
NEW_CONFIG='{
  "location": {
    "latitude": 63.43,
    "longitude": 10.64,
    "stopPlaceIds": []
  },
  "apiKeys": {
    "tibber": "updated-token-456"
  },
  "electricity": {
    "gridFee": 0.36
  },
  "photos": {
    "sharedAlbumUrl": "",
    "interval": 30
  },
  "calendar": {
    "calendars": []
  }
}'

UPDATE_RESPONSE=$(curl -s -X PUT $API/config \
  -b $COOKIES \
  -H "Content-Type: application/json" \
  -d "{
    \"config\": $NEW_CONFIG,
    \"pin\": \"1234\"
  }")

echo "$UPDATE_RESPONSE" | jq .

if [[ $(echo "$UPDATE_RESPONSE" | jq -r .success) == "true" ]]; then
    test_pass "Config updated successfully"
else
    echo "❌ Config update failed"
    echo "$UPDATE_RESPONSE"
    exit 1
fi
echo ""

# Test 6: Verify Update
test_step "Test 6: Verify updated config"
UPDATED_CONFIG=$(curl -s $API/config -b $COOKIES)
echo "$UPDATED_CONFIG" | jq .

NEW_LAT=$(echo "$UPDATED_CONFIG" | jq -r .location.latitude)
NEW_GRIDFEE=$(echo "$UPDATED_CONFIG" | jq -r .electricity.gridFee)
NEW_TIBBER=$(echo "$UPDATED_CONFIG" | jq -r .apiKeys.tibber)

if [ "$NEW_LAT" == "63.43" ] && [ "$NEW_GRIDFEE" == "0.36" ] && [ "$NEW_TIBBER" == "updated-token-456" ]; then
    test_pass "Config update verified"
    test_info "New values: Lat=$NEW_LAT, GridFee=$NEW_GRIDFEE, Tibber=$NEW_TIBBER"
else
    echo "❌ Updated config doesn't match expected values"
    exit 1
fi
echo ""

# Test 7: Test Unauthenticated Access
test_step "Test 7: Test config access without session"
UNAUTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" $API/config)
HTTP_CODE=$(echo "$UNAUTH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" == "401" ]; then
    test_pass "Unauthenticated access properly rejected (401)"
else
    echo "❌ Should have returned 401, got $HTTP_CODE"
    exit 1
fi
echo ""

# Test 8: Test Wrong PIN
test_step "Test 8: Test update with wrong PIN"
WRONG_PIN_RESPONSE=$(curl -s -X PUT $API/config \
  -b $COOKIES \
  -H "Content-Type: application/json" \
  -d "{
    \"config\": $NEW_CONFIG,
    \"pin\": \"9999\"
  }")

if [[ $(echo "$WRONG_PIN_RESPONSE" | jq -r .error) == *"Invalid PIN"* ]]; then
    test_pass "Wrong PIN rejected"
else
    echo "❌ Should have rejected wrong PIN"
    echo "$WRONG_PIN_RESPONSE"
    exit 1
fi
echo ""

# Summary
echo "==================================="
test_pass "All Backend API Tests Passed!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Start frontend: cd .. && npm run dev"
echo "2. Visit http://localhost:3000/admin"
echo "3. Dashboard should load config from server"
echo "4. Check browser console for: '[ConfigContext] Loaded config from server'"
echo ""
echo "Frontend Testing Checklist:"
echo "  □ Navigate to /admin/settings"
echo "  □ Login with PIN: 1234"
echo "  □ Change a setting (e.g., latitude to 62.0)"
echo "  □ Save with PIN"
echo "  □ Go to dashboard (/)"
echo "  □ Console should show: '[ConfigContext] Synced config from server'"
echo "  □ Verify weather uses new latitude"
echo ""
