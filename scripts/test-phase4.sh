#!/bin/bash

# Test script for Phase 4: Setup Wizard

echo "================================"
echo "Phase 4: Setup Wizard Test"
echo "================================"
echo ""

# Clean up any existing processes
echo "Cleaning up existing processes..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
sleep 1

# Clean backend data
echo "Cleaning backend data..."
rm -rf server/data

# Start backend
echo "Starting backend server on :3001..."
cd server
node dist/index.js > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Check backend is running
if curl -s http://localhost:3001/api/auth/status > /dev/null; then
  echo "✓ Backend is running"
else
  echo "✗ Backend failed to start"
  cat /tmp/backend.log
  exit 1
fi

# Start frontend
echo "Starting frontend server on :3000..."
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

echo ""
echo "================================"
echo "Servers are running!"
echo "================================"
echo ""
echo "Backend: http://localhost:3001"
echo "Frontend: http://localhost:3000"
echo ""
echo "Test the following flow:"
echo "1. Visit http://localhost:3000/admin"
echo "2. Click 'Start Setup (TV Display)' to generate code"
echo "3. In another browser window/tab, visit http://localhost:3000/admin/setup/wizard"
echo "4. Enter the code and complete the wizard"
echo "5. Verify redirect to /admin/settings"
echo ""
echo "Press Ctrl+C to stop servers"
echo ""

# Wait for user interrupt
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

# Keep script running
while true; do
  sleep 1
done
