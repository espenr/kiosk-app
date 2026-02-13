#!/bin/bash

# Deploy script for Kiosk App
# Builds the app and deploys to the Raspberry Pi via rsync.
# Tries mDNS hostname first, falls back to static IP.

set -euo pipefail

PI_USER="pi"
PI_MDNS="raspberrypizerow2.local"
PI_IP="192.168.50.37"
PI_DIR="/var/www/kiosk"
LOCAL_DIR="dist/"

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

# Build
echo "Building..."
npm run build

# Deploy
echo ""
echo "Deploying to $PI_USER@$PI_HOST:$PI_DIR..."
rsync -avz --delete "$LOCAL_DIR" "$PI_USER@$PI_HOST:$PI_DIR"

echo ""
echo "Deployment successful!"
echo "App available at http://$PI_HOST"
