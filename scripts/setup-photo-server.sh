#!/bin/bash
#
# Setup script for the photo proxy server on Raspberry Pi
# Run this script ON the Pi after deploying the server files.
#
# Usage: bash /var/www/kiosk/scripts/setup-photo-server.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SERVICE_FILE="$SCRIPT_DIR/kiosk-photos.service"

echo "=== Setting up Kiosk Photo Proxy Server ==="

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo "This script needs sudo privileges for systemd configuration."
    echo "Re-running with sudo..."
    exec sudo bash "$0" "$@"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

echo "Node.js version: $(node --version)"

# Install systemd service
echo ""
echo "Installing systemd service..."
cp "$SERVICE_FILE" /etc/systemd/system/kiosk-photos.service
systemctl daemon-reload
systemctl enable kiosk-photos.service

# Start the service
echo ""
echo "Starting photo proxy service..."
systemctl start kiosk-photos.service
systemctl status kiosk-photos.service --no-pager

# Update Nginx configuration to proxy /api/* to Node.js server
NGINX_CONF="/etc/nginx/sites-available/default"

if [ -f "$NGINX_CONF" ]; then
    echo ""
    echo "Updating Nginx configuration..."

    # Check if api proxy already configured
    if grep -q "location /api/" "$NGINX_CONF"; then
        echo "Nginx /api/ proxy already configured"
    else
        # Add api proxy location before the main location block
        # This is a simple sed replacement - may need manual adjustment
        sed -i '/location \/ {/i \
    location /api/ {\
        proxy_pass http://127.0.0.1:3001/;\
        proxy_http_version 1.1;\
        proxy_set_header Host $host;\
        proxy_set_header X-Real-IP $remote_addr;\
    }\
' "$NGINX_CONF"

        echo "Added /api/ proxy to Nginx config"
        echo "Testing Nginx configuration..."
        nginx -t

        echo "Reloading Nginx..."
        systemctl reload nginx
    fi

    # Ensure root directive points to dist/ subdirectory
    if ! grep -q "root /var/www/kiosk/dist;" "$NGINX_CONF"; then
        echo "Setting Nginx root to /var/www/kiosk/dist..."
        sed -i 's|root .*/var/www/kiosk[^;]*;|root /var/www/kiosk/dist;|' "$NGINX_CONF"
        echo "Testing Nginx configuration..."
        nginx -t
        echo "Reloading Nginx..."
        systemctl reload nginx
    fi
else
    echo ""
    echo "Nginx config not found at $NGINX_CONF"
    echo "Please manually add the following to your Nginx server block:"
    echo ""
    echo '    location /api/ {'
    echo '        proxy_pass http://127.0.0.1:3001/;'
    echo '        proxy_http_version 1.1;'
    echo '        proxy_set_header Host $host;'
    echo '    }'
fi

# Remove old cron job for sync-photos.sh (no longer needed)
echo ""
echo "Checking for old photo sync cron job..."
if crontab -u pi -l 2>/dev/null | grep -q "sync-photos.sh"; then
    echo "Removing old sync-photos.sh cron job (no longer needed)..."
    crontab -u pi -l 2>/dev/null | grep -v "sync-photos.sh" | crontab -u pi -
    echo "Cron job removed"
else
    echo "No old cron job found"
fi

echo ""
echo "=== Setup complete ==="
echo ""
echo "The photo proxy server is now running on port 3001."
echo "Nginx will proxy /api/* requests to the Node.js server."
echo ""
echo "To check status:  systemctl status kiosk-photos"
echo "To view logs:     journalctl -u kiosk-photos -f"
echo "To restart:       systemctl restart kiosk-photos"
