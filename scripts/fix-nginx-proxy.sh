#!/bin/bash
# Fix Nginx proxy configuration to pass /api routes correctly
# Run on Raspberry Pi: sudo bash /var/www/kiosk/scripts/fix-nginx-proxy.sh

set -e

echo "Fixing Nginx proxy configuration..."

# Backup current config
cp /etc/nginx/sites-available/kiosk /etc/nginx/sites-available/kiosk.backup

# Fix the proxy_pass directive
sed -i 's|proxy_pass http://127.0.0.1:3001/;|proxy_pass http://127.0.0.1:3001;|' /etc/nginx/sites-available/kiosk

echo "✓ Configuration updated"

# Test configuration
echo "Testing Nginx configuration..."
nginx -t

# Reload Nginx
echo "Reloading Nginx..."
systemctl reload nginx

echo "✓ Nginx reloaded successfully"

# Test the API endpoint
sleep 1
echo ""
echo "Testing API endpoint..."
curl -s http://localhost/api/auth/status | jq . || echo "Error: endpoint not responding"

echo ""
echo "✓ Fix complete! Admin interface should now work."
