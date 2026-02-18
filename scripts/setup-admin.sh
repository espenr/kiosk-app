#!/bin/bash

# Setup script for Kiosk Admin CLI tool
# Installs the kiosk-admin command to /usr/local/bin

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo "=========================================="
echo "  Kiosk Admin CLI - Installation"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}✗${NC} This script must be run as root"
  echo "Please run: sudo bash scripts/setup-admin.sh"
  exit 1
fi

# Determine installation paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_FILE="${SCRIPT_DIR}/kiosk-admin"
INSTALL_PATH="/usr/local/bin/kiosk-admin"

# Check if source file exists
if [ ! -f "$SOURCE_FILE" ]; then
  echo -e "${RED}✗${NC} Source file not found: ${SOURCE_FILE}"
  exit 1
fi

echo "Source: ${SOURCE_FILE}"
echo "Target: ${INSTALL_PATH}"
echo ""

# Install the CLI tool
echo -e "${BLUE}ℹ${NC} Installing kiosk-admin command..."
cp "$SOURCE_FILE" "$INSTALL_PATH"
chmod +x "$INSTALL_PATH"

echo -e "${GREEN}✓${NC} Installed: ${INSTALL_PATH}"
echo ""

# Verify installation
if command -v kiosk-admin &> /dev/null; then
  echo -e "${GREEN}✓${NC} Installation successful"
  echo ""

  # Show version info
  echo "=========================================="
  echo "  Available Commands"
  echo "=========================================="
  echo ""
  echo "  kiosk-admin reset-pin"
  echo "    Reset admin PIN (preserves settings)"
  echo ""
  echo "  kiosk-admin factory-reset"
  echo "    Delete all data (fresh start)"
  echo ""
  echo "  kiosk-admin status"
  echo "    Show system status"
  echo ""
  echo "  kiosk-admin help"
  echo "    Show detailed help"
  echo ""

  # Test the command
  echo "Testing installation..."
  if kiosk-admin help > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Command is working"
  else
    echo -e "${RED}✗${NC} Command test failed"
    exit 1
  fi
else
  echo -e "${RED}✗${NC} Installation failed - command not found"
  exit 1
fi

echo ""
echo "=========================================="
echo "  Setup Complete"
echo "=========================================="
echo ""
echo "The kiosk-admin command is now available system-wide."
echo ""
echo "Example usage:"
echo ""
echo "  # Reset PIN (keeps settings)"
echo "  sudo kiosk-admin reset-pin"
echo ""
echo "  # Check status"
echo "  sudo kiosk-admin status"
echo ""
echo "For more information:"
echo "  kiosk-admin help"
echo ""
