#!/bin/bash

cd "$(dirname "$0")/server"

# Start server in background
npm run dev > /tmp/kiosk-server-test.log 2>&1 &
SERVER_PID=$!

# Wait for server to start
sleep 3

echo "Testing auth status endpoint..."
curl -s http://localhost:3001/api/auth/status | jq .

echo ""
echo "Testing init setup endpoint..."
curl -X POST -s http://localhost:3001/api/auth/init-setup | jq .

echo ""
echo "Testing complete setup endpoint..."
curl -X POST -s http://localhost:3001/api/auth/complete-setup \
  -H "Content-Type: application/json" \
  -d '{
    "code": "ABC123",
    "pin": "1234",
    "config": {
      "location": {
        "latitude": 63.43,
        "longitude": 10.64,
        "stopPlaceIds": []
      },
      "apiKeys": {
        "tibber": ""
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
    }
  }' | jq .

# Stop server
kill $SERVER_PID 2>/dev/null
wait $SERVER_PID 2>/dev/null

echo ""
echo "Server log:"
cat /tmp/kiosk-server-test.log
