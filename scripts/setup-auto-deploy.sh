#!/bin/bash
#
# Setup Automatic Deployment for Kiosk App
# Run this once on the Raspberry Pi to configure auto-updates
#
# Usage: sudo bash setup-auto-deploy.sh
#

set -e

# Check for root
if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root (sudo)"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIOSK_DIR="/var/www/kiosk"
RELEASES_DIR="/var/www/kiosk-releases"

echo "=========================================="
echo "Kiosk App Auto-Deploy Setup"
echo "=========================================="
echo ""

# Create releases directory structure
echo "[1/5] Creating directory structure..."
mkdir -p "$RELEASES_DIR"
chown -R pi:pi "$RELEASES_DIR"

# If kiosk is a directory (not symlink), migrate it
if [[ -d "$KIOSK_DIR" && ! -L "$KIOSK_DIR" ]]; then
    echo "[2/5] Migrating existing installation..."

    # Get current version or create one
    if [[ -f "$KIOSK_DIR/VERSION" ]]; then
        VERSION=$(cat "$KIOSK_DIR/VERSION")
    else
        VERSION="v$(date +'%Y.%m.%d').0"
        echo "$VERSION" > "$KIOSK_DIR/VERSION"
    fi

    # Move to releases dir
    mv "$KIOSK_DIR" "$RELEASES_DIR/$VERSION"

    # Create symlink
    ln -sfn "$RELEASES_DIR/$VERSION" "$KIOSK_DIR"

    echo "  Migrated existing install to $RELEASES_DIR/$VERSION"
else
    echo "[2/5] No existing installation to migrate (OK)"
fi

# Make auto-update script executable
echo "[3/5] Setting up auto-update script..."
chmod +x "$KIOSK_DIR/scripts/auto-update.sh"

# Allow pi user to restart services without password
echo "[4/5] Configuring sudoers..."
SUDOERS_FILE="/etc/sudoers.d/kiosk-updater"
cat > "$SUDOERS_FILE" << 'EOF'
# Allow pi user to restart kiosk services without password
pi ALL=(ALL) NOPASSWD: /bin/systemctl restart kiosk-photos
pi ALL=(ALL) NOPASSWD: /bin/systemctl restart nginx
EOF
chmod 440 "$SUDOERS_FILE"
echo "  Created $SUDOERS_FILE"

# Install systemd service and timer
echo "[5/5] Installing systemd units..."
cp "$SCRIPT_DIR/kiosk-updater.service" /etc/systemd/system/
cp "$SCRIPT_DIR/kiosk-updater.timer" /etc/systemd/system/

systemctl daemon-reload
systemctl enable kiosk-updater.timer
systemctl start kiosk-updater.timer

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Auto-update is now enabled. The Pi will check for updates every 5 minutes."
echo ""
echo "Commands:"
echo "  Check status:     /var/www/kiosk/scripts/auto-update.sh status"
echo "  Manual update:    /var/www/kiosk/scripts/auto-update.sh update"
echo "  Rollback:         /var/www/kiosk/scripts/auto-update.sh rollback"
echo ""
echo "Systemd:"
echo "  Timer status:     systemctl status kiosk-updater.timer"
echo "  View logs:        journalctl -u kiosk-updater -f"
echo "  Disable updates:  sudo systemctl disable --now kiosk-updater.timer"
echo ""
