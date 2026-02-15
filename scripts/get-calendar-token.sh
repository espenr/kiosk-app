#!/bin/bash
# Script to generate a refresh token for Google Calendar API using device code flow
# This is the appropriate flow for TV/kiosk devices

# Get credentials from environment or prompt
if [ -z "$GOOGLE_CLIENT_ID" ]; then
  echo -n "Enter Google OAuth Client ID: "
  read GOOGLE_CLIENT_ID
fi

if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
  echo -n "Enter Google OAuth Client Secret: "
  read GOOGLE_CLIENT_SECRET
fi

CLIENT_ID="$GOOGLE_CLIENT_ID"
CLIENT_SECRET="$GOOGLE_CLIENT_SECRET"
SCOPE="https://www.googleapis.com/auth/calendar.readonly"

echo "=== Google Calendar OAuth Token Generator ==="
echo ""
echo "Step 1: Requesting device code..."

# Request device code
DEVICE_RESPONSE=$(curl -s -X POST "https://oauth2.googleapis.com/device/code" \
  -d "client_id=${CLIENT_ID}" \
  -d "scope=${SCOPE}")

# Extract values from response using Python for reliable JSON parsing
DEVICE_CODE=$(echo "$DEVICE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('device_code', ''))")
USER_CODE=$(echo "$DEVICE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('user_code', ''))")
VERIFICATION_URL=$(echo "$DEVICE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('verification_url', ''))")
INTERVAL=$(echo "$DEVICE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('interval', 5))")

if [ -z "$DEVICE_CODE" ]; then
  echo "Error: Failed to get device code"
  echo "Response: $DEVICE_RESPONSE"
  exit 1
fi

echo ""
echo "Step 2: Please authorize the application"
echo "============================================"
echo ""
echo "  1. Go to: $VERIFICATION_URL"
echo ""
echo "  2. Enter code: $USER_CODE"
echo ""
echo "  3. Sign in with your Google account and allow access"
echo ""
echo "============================================"
echo ""
echo "Opening browser..."
open "$VERIFICATION_URL" 2>/dev/null || xdg-open "$VERIFICATION_URL" 2>/dev/null || echo "Please open the URL manually"

echo ""
echo "Waiting for authorization (press Ctrl+C to cancel)..."
echo ""

# Poll for token
INTERVAL=${INTERVAL:-5}
while true; do
  sleep $INTERVAL

  TOKEN_RESPONSE=$(curl -s -X POST "https://oauth2.googleapis.com/token" \
    -d "client_id=${CLIENT_ID}" \
    -d "client_secret=${CLIENT_SECRET}" \
    -d "device_code=${DEVICE_CODE}" \
    -d "grant_type=urn:ietf:params:oauth:grant-type:device_code")

  # Check for errors using Python for reliable JSON parsing
  ERROR=$(echo "$TOKEN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('error', ''))" 2>/dev/null || echo "")

  if [ "$ERROR" = "authorization_pending" ]; then
    echo -n "."
    continue
  elif [ "$ERROR" = "slow_down" ]; then
    INTERVAL=$((INTERVAL + 5))
    echo -n "."
    continue
  elif [ -n "$ERROR" ]; then
    echo ""
    echo "Error: $ERROR"
    echo "Response: $TOKEN_RESPONSE"
    exit 1
  fi

  # Extract tokens using Python
  ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))")
  REFRESH_TOKEN=$(echo "$TOKEN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('refresh_token', ''))")

  if [ -n "$REFRESH_TOKEN" ]; then
    echo ""
    echo ""
    echo "=== SUCCESS! ==="
    echo ""
    echo "Refresh Token:"
    echo "$REFRESH_TOKEN"
    echo ""
    echo "============================================"
    echo "Save this refresh token! You'll need it for your kiosk app configuration."
    echo ""
    echo "To configure the kiosk app, run this in the browser console:"
    echo ""
    echo "const config = JSON.parse(localStorage.getItem('kiosk-app:config') || '{}');"
    echo "config.calendar = {"
    echo "  clientId: '${CLIENT_ID}',"
    echo "  clientSecret: '${CLIENT_SECRET}',"
    echo "  refreshToken: '${REFRESH_TOKEN}',"
    echo "  calendars: ["
    echo "    { id: 'primary', name: 'Me', color: '#4285f4', icon: '👤' },"
    echo "    // Add more calendars as needed:"
    echo "    // { id: 'family@gmail.com', name: 'Family', color: '#e91e63', icon: '👨‍👩‍👧‍👦' }"
    echo "  ]"
    echo "};"
    echo "localStorage.setItem('kiosk-app:config', JSON.stringify(config));"
    echo "location.reload();"
    echo ""
    exit 0
  fi
done
