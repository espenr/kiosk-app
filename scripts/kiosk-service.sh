#!/bin/bash
# Kiosk Service Management Script for Raspberry Pi
# Usage: ./scripts/kiosk-service.sh [command]

set -e

PI_HOST="pi@pi"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    cat << EOF
Kiosk Service Management Script

Usage: $0 [command]

Commands:
    status      Show service status and key metrics
    start       Start the kiosk service
    stop        Stop the kiosk service
    restart     Restart the kiosk service
    logs        View service logs (follow mode)
    verify      Comprehensive verification check
    enable      Enable service to start at boot
    disable     Disable service from starting at boot

Examples:
    $0 status
    $0 restart
    $0 logs
EOF
    exit 1
}

run_ssh() {
    ssh "$PI_HOST" "$@"
}

cmd_status() {
    echo -e "${YELLOW}=== Service Status ===${NC}"
    run_ssh "systemctl --user status kiosk.service | head -20"
}

cmd_start() {
    echo -e "${YELLOW}Starting kiosk service...${NC}"
    run_ssh "systemctl --user start kiosk.service"
    echo -e "${GREEN}Service started${NC}"
    sleep 2
    cmd_status
}

cmd_stop() {
    echo -e "${YELLOW}Stopping kiosk service...${NC}"
    run_ssh "systemctl --user stop kiosk.service"
    echo -e "${GREEN}Service stopped${NC}"
}

cmd_restart() {
    echo -e "${YELLOW}Restarting kiosk service...${NC}"
    run_ssh "systemctl --user restart kiosk.service"
    echo -e "${GREEN}Service restarted${NC}"
    sleep 2
    cmd_status
}

cmd_logs() {
    echo -e "${YELLOW}Viewing service logs (Ctrl+C to exit)...${NC}"
    run_ssh "journalctl --user -u kiosk.service -f"
}

cmd_verify() {
    echo -e "${YELLOW}=== Comprehensive Kiosk Verification ===${NC}\n"

    run_ssh "
        echo '${YELLOW}Service Status:${NC}'
        systemctl --user is-active kiosk.service && echo '${GREEN}✓ Service is running${NC}' || echo '${RED}✗ Service is not running${NC}'

        echo -e '\n${YELLOW}Screen Rotation:${NC}'
        DISPLAY=:0 xrandr | grep HDMI | grep -q 'left' && echo '${GREEN}✓ Screen rotated to portrait${NC}' || echo '${RED}✗ Screen not rotated${NC}'

        echo -e '\n${YELLOW}Web Server:${NC}'
        curl -s -o /dev/null -w '%{http_code}' http://localhost | grep -q '200' && echo '${GREEN}✓ Web server responding (HTTP 200)${NC}' || echo '${RED}✗ Web server not responding${NC}'

        echo -e '\n${YELLOW}Chromium Process:${NC}'
        pgrep -f 'chromium.*kiosk' > /dev/null && echo '${GREEN}✓ Chromium running in kiosk mode${NC}' || echo '${RED}✗ Chromium not running${NC}'

        echo -e '\n${YELLOW}Linger Status:${NC}'
        loginctl show-user pi | grep -q 'Linger=yes' && echo '${GREEN}✓ User linger enabled${NC}' || echo '${RED}✗ User linger not enabled${NC}'

        echo -e '\n${YELLOW}Service Enabled:${NC}'
        systemctl --user is-enabled kiosk.service > /dev/null 2>&1 && echo '${GREEN}✓ Service enabled at boot${NC}' || echo '${RED}✗ Service not enabled at boot${NC}'

        echo -e '\n${YELLOW}Keyring Files:${NC}'
        if [ -f ~/.local/share/keyrings/login.keyring ] || ls ~/.local/share/keyrings/Default* > /dev/null 2>&1; then
            echo '${YELLOW}⚠ Old keyring files exist (may cause dialog)${NC}'
        else
            echo '${GREEN}✓ No old keyring files${NC}'
        fi
    "
}

cmd_enable() {
    echo -e "${YELLOW}Enabling kiosk service...${NC}"
    run_ssh "systemctl --user enable kiosk.service"
    echo -e "${GREEN}Service enabled to start at boot${NC}"
}

cmd_disable() {
    echo -e "${YELLOW}Disabling kiosk service...${NC}"
    run_ssh "systemctl --user disable kiosk.service"
    echo -e "${GREEN}Service disabled from starting at boot${NC}"
}

# Main command handler
case "${1:-}" in
    status)
        cmd_status
        ;;
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    restart)
        cmd_restart
        ;;
    logs)
        cmd_logs
        ;;
    verify)
        cmd_verify
        ;;
    enable)
        cmd_enable
        ;;
    disable)
        cmd_disable
        ;;
    *)
        usage
        ;;
esac
