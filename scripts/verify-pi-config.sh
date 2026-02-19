#!/bin/bash
# Quick script to verify Pi configuration

echo "Checking Pi configuration..."
echo ""

echo "1. Checking if setup is complete:"
curl -s http://raspberrypizerow2.local/api/auth/status | python3 -m json.tool
echo ""

echo "2. Checking data files on Pi:"
ssh pi@raspberrypizerow2.local "ls -lh /var/www/kiosk/server/data/ 2>/dev/null"
echo ""

echo "3. Checking backend service:"
ssh pi@raspberrypizerow2.local "systemctl status kiosk-photos | grep -E 'Active:|Main PID'"
echo ""

echo "4. Testing auth endpoint from Pi localhost:"
ssh pi@raspberrypizerow2.local "curl -s http://localhost:3001/api/auth/status"
echo ""
