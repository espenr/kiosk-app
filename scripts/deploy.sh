#!/bin/bash

# Deploy script for Kiosk App
# Builds the app and deploys to the Raspberry Pi via rsync.
# Also deploys the photo proxy server and scripts.
# Tries mDNS hostname first, falls back to static IP.

set -euo pipefail

PI_USER="pi"
PI_MDNS="raspberrypizerow2.local"
PI_IP="192.168.50.37"
PI_DIR="/var/www/kiosk"
LOCAL_DIST="dist/"
LOCAL_SCRIPTS="scripts/"
LOCAL_SERVER="server/"

# Resolve Pi host - try mDNS first, then static IP
resolve_host() {
  if ssh -o ConnectTimeout=3 -o BatchMode=yes "$PI_USER@$PI_MDNS" "echo ok" &>/dev/null; then
    echo "$PI_MDNS"
  elif ssh -o ConnectTimeout=3 -o BatchMode=yes "$PI_USER@$PI_IP" "echo ok" &>/dev/null; then
    echo "$PI_IP"
  else
    echo ""
  fi
}

echo "Checking Pi connectivity..."
PI_HOST=$(resolve_host)

if [ -z "$PI_HOST" ]; then
  echo "Cannot reach the Pi at $PI_MDNS or $PI_IP."
  echo "Run 'bash scripts/setup-deploy.sh' to set up SSH access."
  exit 1
fi

echo "Pi reachable at $PI_HOST"
echo ""

# Build frontend
echo "Building frontend..."
npm run build

# Build server
echo ""
echo "Building photo proxy server..."
(cd server && npm install && npm run build)

# Deploy built app (exclude photos.json - it's managed by sync script)
echo ""
echo "Deploying app to $PI_USER@$PI_HOST:$PI_DIR..."
# Remove local photos.json from dist to avoid overwriting Pi's synced version
rm -f "${LOCAL_DIST}photos.json" "${LOCAL_DIST}photos.sample.json"
rsync -avz --delete \
  --exclude 'scripts/' \
  --exclude '.env' \
  --exclude 'photos.json' \
  "$LOCAL_DIST" "$PI_USER@$PI_HOST:$PI_DIR/"

# Deploy scripts (without deleting existing files like .env)
echo ""
echo "Deploying scripts..."
rsync -avz "$LOCAL_SCRIPTS" "$PI_USER@$PI_HOST:$PI_DIR/scripts/"

# Make scripts executable
ssh "$PI_USER@$PI_HOST" "chmod +x $PI_DIR/scripts/*.sh"

# Deploy photo proxy server
echo ""
echo "Deploying photo proxy server..."
ssh "$PI_USER@$PI_HOST" "mkdir -p $PI_DIR/server"
rsync -avz --delete \
  --exclude 'node_modules/' \
  --exclude 'src/' \
  "${LOCAL_SERVER}dist/" "$PI_USER@$PI_HOST:$PI_DIR/server/dist/"
rsync -avz "${LOCAL_SERVER}package.json" "$PI_USER@$PI_HOST:$PI_DIR/server/"

# Install server dependencies on Pi (production only)
echo ""
echo "Installing server dependencies..."
ssh "$PI_USER@$PI_HOST" "cd $PI_DIR/server && npm install --omit=dev 2>/dev/null || npm install --production"

# Check if photo proxy service is configured
echo ""
echo "Checking photo proxy server..."
if ssh "$PI_USER@$PI_HOST" "systemctl is-active --quiet kiosk-photos 2>/dev/null"; then
  echo "Photo proxy service is running, restarting..."
  ssh "$PI_USER@$PI_HOST" "sudo systemctl restart kiosk-photos"
else
  echo "Photo proxy service not configured yet."
  if ssh "$PI_USER@$PI_HOST" "test -f $PI_DIR/.env && grep -q ICLOUD_ALBUM_URL $PI_DIR/.env"; then
    echo "iCloud album URL found. To enable the photo proxy server, run on the Pi:"
    echo "  sudo bash $PI_DIR/scripts/setup-photo-server.sh"
  else
    echo "To enable photo slideshow:"
    echo "  1. Create .env on the Pi:"
    echo "     echo 'ICLOUD_ALBUM_URL=https://www.icloud.com/sharedalbum/#YOUR_TOKEN' > $PI_DIR/.env"
    echo "  2. Run the setup script:"
    echo "     sudo bash $PI_DIR/scripts/setup-photo-server.sh"
  fi
fi

echo ""
echo "Deployment successful!"
echo "App available at http://$PI_HOST"
