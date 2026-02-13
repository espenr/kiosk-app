#!/bin/bash

# Setup script for new dev machines to deploy to the Kiosk Pi
# Run: bash scripts/setup-deploy.sh

set -euo pipefail

PI_USER="pi"
PI_MDNS="raspberrypizerow2.local"
PI_IP="192.168.50.37"
PI_DIR="/var/www/kiosk"

echo "=== Kiosk App - Deploy Setup ==="
echo ""

# Step 1: Check rsync
echo "Checking rsync..."
if command -v rsync &>/dev/null; then
  echo "  rsync: OK"
else
  echo "  rsync: MISSING - install with: sudo apt install rsync"
  exit 1
fi

# Step 2: Check node_modules
echo "Checking node_modules..."
if [ -d "node_modules" ]; then
  echo "  node_modules: OK"
else
  echo "  node_modules: MISSING - run: npm install"
  exit 1
fi

# Step 3: Resolve Pi hostname
echo "Checking Pi connectivity..."
PI_HOST=""

if ssh -o ConnectTimeout=3 -o BatchMode=yes "$PI_USER@$PI_MDNS" "echo ok" &>/dev/null; then
  PI_HOST="$PI_MDNS"
  echo "  mDNS ($PI_MDNS): OK"
elif ssh -o ConnectTimeout=3 -o BatchMode=yes "$PI_USER@$PI_IP" "echo ok" &>/dev/null; then
  PI_HOST="$PI_IP"
  echo "  mDNS ($PI_MDNS): failed"
  echo "  Static IP ($PI_IP): OK"
  echo ""
  echo "  Tip: Install avahi on the Pi so mDNS works from any machine:"
  echo "    ssh espen@$PI_IP 'sudo apt-get install -y avahi-daemon && sudo systemctl enable avahi-daemon'"
else
  echo "  mDNS ($PI_MDNS): failed"
  echo "  Static IP ($PI_IP): failed"
  echo ""

  # Check if SSH key exists
  if [ -f "$HOME/.ssh/id_ed25519.pub" ]; then
    KEY_FILE="$HOME/.ssh/id_ed25519.pub"
  elif [ -f "$HOME/.ssh/id_rsa.pub" ]; then
    KEY_FILE="$HOME/.ssh/id_rsa.pub"
  else
    KEY_FILE=""
  fi

  if [ -z "$KEY_FILE" ]; then
    echo "  No SSH key found. Generate one first:"
    echo "    ssh-keygen -t ed25519"
    echo ""
    echo "  Then copy it to the Pi:"
    echo "    ssh-copy-id -i ~/.ssh/id_ed25519.pub $PI_USER@$PI_IP"
  else
    echo "  SSH key found: $KEY_FILE"
    echo "  Copy it to the Pi:"
    echo "    ssh-copy-id -i $KEY_FILE $PI_USER@$PI_IP"
    echo ""
    echo "  If the Pi is at a different IP, use:"
    echo "    ssh-copy-id -i $KEY_FILE $PI_USER@<pi-ip>"
  fi

  echo ""
  echo "  After setting up SSH key auth, re-run this script."
  exit 1
fi

# Step 4: Verify deploy directory
echo "Checking deploy directory..."
if ssh -o ConnectTimeout=3 "$PI_USER@$PI_HOST" "test -d $PI_DIR" &>/dev/null; then
  echo "  $PI_DIR: OK"
else
  echo "  $PI_DIR: does not exist"
  echo "  Create it on the Pi:"
  echo "    ssh espen@$PI_HOST 'sudo mkdir -p $PI_DIR && sudo chown pi:pi $PI_DIR'"
  exit 1
fi

# Done
echo ""
echo "=== Setup complete ==="
echo ""
echo "  Pi reachable at: $PI_HOST"
echo "  Deploy with:     npm run deploy"
