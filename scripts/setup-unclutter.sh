#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_FILE="$SCRIPT_DIR/systemd/unclutter.service"
USER_SYSTEMD_DIR="$HOME/.config/systemd/user"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up unclutter service...${NC}"

# Check if unclutter is installed
if ! command -v unclutter &> /dev/null; then
    echo -e "${YELLOW}unclutter not found, installing...${NC}"
    sudo apt update
    sudo apt install -y unclutter
    echo -e "${GREEN}✓ unclutter installed${NC}"
else
    echo -e "${GREEN}✓ unclutter already installed${NC}"
fi

# Create systemd user directory if it doesn't exist
mkdir -p "$USER_SYSTEMD_DIR"

# Copy service file
echo -e "${YELLOW}Installing service file...${NC}"
cp "$SERVICE_FILE" "$USER_SYSTEMD_DIR/unclutter.service"
echo -e "${GREEN}✓ Service file copied to $USER_SYSTEMD_DIR/unclutter.service${NC}"

# Reload systemd daemon
echo -e "${YELLOW}Reloading systemd daemon...${NC}"
systemctl --user daemon-reload
echo -e "${GREEN}✓ Systemd daemon reloaded${NC}"

# Enable service
echo -e "${YELLOW}Enabling unclutter service...${NC}"
systemctl --user enable unclutter.service
echo -e "${GREEN}✓ Service enabled (will start on boot)${NC}"

# Start service
echo -e "${YELLOW}Starting unclutter service...${NC}"
systemctl --user start unclutter.service
echo -e "${GREEN}✓ Service started${NC}"

# Wait a moment for service to start
sleep 2

# Verify service is running
echo -e "\n${YELLOW}Verifying service status...${NC}"
if systemctl --user is-active --quiet unclutter.service; then
    echo -e "${GREEN}✓ Service is running${NC}"

    # Check if process exists
    if pgrep -f unclutter > /dev/null; then
        PID=$(pgrep -f unclutter)
        echo -e "${GREEN}✓ unclutter process found (PID: $PID)${NC}"
        echo -e "${GREEN}✓ Mouse cursor should now be hidden after 0.1 seconds of inactivity${NC}"
    else
        echo -e "${RED}✗ Service running but process not found${NC}"
        echo -e "${YELLOW}Check logs with: journalctl --user -u unclutter.service${NC}"
    fi
else
    echo -e "${RED}✗ Service failed to start${NC}"
    echo -e "${YELLOW}Check status with: systemctl --user status unclutter.service${NC}"
    exit 1
fi

echo -e "\n${GREEN}Setup complete!${NC}"
echo -e "\nUseful commands:"
echo -e "  Status:  ${YELLOW}systemctl --user status unclutter.service${NC}"
echo -e "  Stop:    ${YELLOW}systemctl --user stop unclutter.service${NC}"
echo -e "  Start:   ${YELLOW}systemctl --user start unclutter.service${NC}"
echo -e "  Restart: ${YELLOW}systemctl --user restart unclutter.service${NC}"
echo -e "  Logs:    ${YELLOW}journalctl --user -u unclutter.service${NC}"
