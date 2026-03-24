#!/bin/bash

# Setup script for kiosk backend systemd service
# This script installs and enables the backend service for automatic management

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_FILE="$SCRIPT_DIR/systemd/kiosk-backend.service"
SYSTEMD_DIR="/etc/systemd/system"
SERVICE_NAME="kiosk-backend.service"

echo "=========================================="
echo "Kiosk Backend Service Setup"
echo "=========================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "ERROR: This script must be run as root (use sudo)"
    exit 1
fi

# Check if service file exists
if [ ! -f "$SERVICE_FILE" ]; then
    echo "ERROR: Service file not found at $SERVICE_FILE"
    exit 1
fi

echo "1. Stopping any existing backend process..."
# Kill any existing Node.js process running the backend
pkill -f "node.*server/dist/index.js" || true
sleep 2

echo "2. Installing systemd service file..."
cp "$SERVICE_FILE" "$SYSTEMD_DIR/$SERVICE_NAME"
chmod 644 "$SYSTEMD_DIR/$SERVICE_NAME"

echo "3. Reloading systemd daemon..."
systemctl daemon-reload

echo "4. Enabling service (auto-start on boot)..."
systemctl enable "$SERVICE_NAME"

echo "5. Starting service..."
systemctl start "$SERVICE_NAME"

# Wait for service to start
sleep 3

echo ""
echo "=========================================="
echo "Service Status:"
echo "=========================================="
systemctl status "$SERVICE_NAME" --no-pager || true

echo ""
echo "=========================================="
echo "Health Check:"
echo "=========================================="

# Check if backend is responding
if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy and responding on port 3001"
else
    echo "⚠️  WARNING: Backend not responding to health check"
    echo "   Check logs with: journalctl -u kiosk-backend -n 50"
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Useful commands:"
echo "  systemctl status kiosk-backend    # Check service status"
echo "  systemctl restart kiosk-backend   # Restart service"
echo "  systemctl stop kiosk-backend      # Stop service"
echo "  journalctl -u kiosk-backend -f    # View live logs"
echo ""
