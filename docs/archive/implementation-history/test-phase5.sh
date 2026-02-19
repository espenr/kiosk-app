#!/bin/bash

# Test script for Phase 5: Login & Settings UI

echo "================================"
echo "Phase 5: Settings UI Test"
echo "================================"
echo ""

# Clean up
echo "Cleaning up..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
rm -rf server/data
sleep 1

# Start backend
echo "Starting backend..."
cd server
npm run build > /dev/null 2>&1
node dist/index.js > /tmp/phase5-backend.log 2>&1 &
BACKEND_PID=$!
cd ..
sleep 2

# Check backend
if ! curl -s http://localhost:3001/api/auth/status > /dev/null; then
  echo "✗ Backend failed to start"
  kill $BACKEND_PID 2>/dev/null
  exit 1
fi
echo "✓ Backend running on :3001"

# Start frontend
echo "Starting frontend..."
npm run dev > /tmp/phase5-frontend.log 2>&1 &
FRONTEND_PID=$!
sleep 5

echo ""
echo "================================"
echo "Servers Ready!"
echo "================================"
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:3001"
echo ""
echo "Test Flow:"
echo "----------"
echo "1. Setup"
echo "   - Visit http://localhost:3000/admin"
echo "   - Click 'Start Setup'"
echo "   - Open new tab: http://localhost:3000/admin/setup/wizard"
echo "   - Complete wizard with code, PIN '1234', defaults"
echo ""
echo "2. Settings Page"
echo "   - Should auto-redirect to http://localhost:3000/admin/settings"
echo "   - Verify all sections load correctly"
echo "   - Try editing fields (lat: 60.0, grid fee: 0.40)"
echo "   - Click 'Save Changes' → Enter PIN → Verify success"
echo ""
echo "3. Logout"
echo "   - Click 'Logout' button"
echo "   - Should redirect to http://localhost:3000/admin/login"
echo "   - Try accessing /admin/settings → should redirect back"
echo ""
echo "4. Login"
echo "   - Enter PIN '1234'"
echo "   - Should redirect back to settings"
echo "   - Verify changes persisted"
echo ""
echo "5. Recovery Page"
echo "   - Visit http://localhost:3000/admin/recovery"
echo "   - Verify SSH instructions display"
echo "   - Check all code blocks render correctly"
echo ""
echo "6. Factory Reset"
echo "   - From settings, click 'Factory Reset'"
echo "   - Read warning, type 'RESET', enter PIN"
echo "   - Click 'Factory Reset' → Should redirect to /admin/setup"
echo "   - Verify data deleted: ls -la server/data/"
echo ""
echo "API Test Commands:"
echo "------------------"
echo ""
echo "# Get config (requires auth)"
echo "curl -s http://localhost:3001/api/config -b /tmp/cookies.txt | jq ."
echo ""
echo "# Update config"
echo "curl -s -X PUT http://localhost:3001/api/config \\"
echo "  -b /tmp/cookies.txt \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"config\": {...}, \"pin\": \"1234\"}' | jq ."
echo ""
echo "# Factory reset"
echo "curl -s -X POST http://localhost:3001/api/config/factory-reset \\"
echo "  -b /tmp/cookies.txt \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"pin\": \"1234\"}' | jq ."
echo ""
echo "Press Ctrl+C to stop servers"
echo ""

# Keep running
trap "echo ''; echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
while true; do sleep 1; done
