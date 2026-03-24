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
    status          Show service status and key metrics
    start           Start the kiosk service
    stop            Stop the kiosk service
    restart         Restart the kiosk service
    logs            View service logs (follow mode)
    verify          Comprehensive verification check
    enable          Enable service to start at boot
    disable         Disable service from starting at boot
    cursor-status   Check if cursor is hidden (unclutter status)
    hide-cursor     Start unclutter service to hide cursor
    show-cursor     Stop unclutter service (for debugging)
    backend-status  Check backend service status
    backend-logs    View backend service logs
    backend-restart Restart backend service
    backend-health  Test backend health endpoint

Examples:
    $0 status
    $0 restart
    $0 logs
    $0 backend-health
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

        echo -e '\n${YELLOW}Mouse Cursor:${NC}'
        pgrep -f unclutter > /dev/null && echo '${GREEN}✓ Unclutter running (cursor hidden)${NC}' || echo '${RED}✗ Unclutter not running (cursor visible)${NC}'
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

cmd_cursor_status() {
    echo -e "${YELLOW}=== Cursor Status ===${NC}"
    run_ssh "
        if systemctl --user is-active --quiet unclutter.service; then
            echo '${GREEN}✓ Unclutter service is running${NC}'
            if pgrep -f unclutter > /dev/null; then
                PID=\$(pgrep -f unclutter)
                echo '${GREEN}✓ Unclutter process found (PID: \$PID)${NC}'
                echo '${GREEN}✓ Mouse cursor is hidden${NC}'
            else
                echo '${YELLOW}⚠ Service running but process not found${NC}'
            fi
        else
            echo '${RED}✗ Unclutter service is not running${NC}'
            echo '${RED}✗ Mouse cursor is visible${NC}'
        fi
    "
}

cmd_hide_cursor() {
    echo -e "${YELLOW}Starting unclutter service...${NC}"
    run_ssh "systemctl --user start unclutter.service"
    echo -e "${GREEN}Service started${NC}"
    sleep 1
    cmd_cursor_status
}

cmd_show_cursor() {
    echo -e "${YELLOW}Stopping unclutter service (for debugging)...${NC}"
    run_ssh "systemctl --user stop unclutter.service"
    echo -e "${GREEN}Service stopped - cursor will be visible${NC}"
}

cmd_backend_status() {
    echo -e "${YELLOW}=== Backend Service Status ===${NC}"
    run_ssh "systemctl status kiosk-photos.service | head -20"
}

cmd_backend_logs() {
    echo -e "${YELLOW}=== Backend Service Logs (following...) ===${NC}"
    echo -e "${YELLOW}Press Ctrl+C to exit${NC}\n"
    run_ssh "journalctl -u kiosk-photos.service -f"
}

cmd_backend_restart() {
    echo -e "${YELLOW}Restarting backend service...${NC}"
    run_ssh "sudo systemctl restart kiosk-photos.service"
    echo -e "${GREEN}Service restarted${NC}"
    sleep 2
    cmd_backend_health
}

cmd_backend_health() {
    echo -e "${YELLOW}=== Backend Health Check ===${NC}"
    run_ssh "
        # Check service status
        if systemctl is-active --quiet kiosk-photos.service; then
            echo '${GREEN}✓ Backend service is running${NC}'
        else
            echo '${RED}✗ Backend service is not running${NC}'
            exit 1
        fi

        # Check port
        if ss -tlnp 2>/dev/null | grep -q ':3001'; then
            echo '${GREEN}✓ Port 3001 is listening${NC}'
        else
            echo '${RED}✗ Port 3001 is not listening${NC}'
        fi

        # Test health endpoint
        echo ''
        echo '${YELLOW}Testing endpoints:${NC}'

        if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
            echo '${GREEN}✓ /api/health responding${NC}'
        else
            echo '${RED}✗ /api/health not responding${NC}'
        fi

        PHOTO_COUNT=\$(curl -sf http://localhost:3001/api/photos 2>/dev/null | grep -o '\"photos\":\\[' | wc -l)
        if [ \"\$PHOTO_COUNT\" -gt 0 ]; then
            TOTAL_PHOTOS=\$(curl -sf http://localhost:3001/api/photos 2>/dev/null | grep -o '\"url\":' | wc -l)
            echo \"${GREEN}✓ /api/photos responding (\$TOTAL_PHOTOS photos)${NC}\"
        else
            echo '${RED}✗ /api/photos not responding${NC}'
        fi

        CAL_STATUS=\$(curl -sf -o /dev/null -w '%{http_code}' http://localhost:3001/api/calendar/events 2>/dev/null || echo '000')
        if [ \"\$CAL_STATUS\" == \"200\" ]; then
            echo \"${GREEN}✓ /api/calendar/events responding (HTTP 200)${NC}\"
        elif [ \"\$CAL_STATUS\" == \"401\" ] || [ \"\$CAL_STATUS\" == \"500\" ]; then
            echo \"${YELLOW}⚠ /api/calendar/events responding (HTTP \$CAL_STATUS - config issue)${NC}\"
        else
            echo \"${RED}✗ /api/calendar/events not responding (HTTP \$CAL_STATUS)${NC}\"
        fi
    "
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
    cursor-status)
        cmd_cursor_status
        ;;
    hide-cursor)
        cmd_hide_cursor
        ;;
    show-cursor)
        cmd_show_cursor
        ;;
    backend-status)
        cmd_backend_status
        ;;
    backend-logs)
        cmd_backend_logs
        ;;
    backend-restart)
        cmd_backend_restart
        ;;
    backend-health)
        cmd_backend_health
        ;;
    *)
        usage
        ;;
esac
