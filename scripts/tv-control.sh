#!/bin/bash
# TV Power Control via HDMI CEC
# Usage: tv-control.sh [on|off|status]

set -e

COMMAND="${1:-status}"
LOG_FILE="/var/log/tv-control.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | sudo tee -a "$LOG_FILE"
}

case "$COMMAND" in
    on)
        log "Turning TV ON"
        echo 'on 0' | cec-client -s -d 1
        log "TV ON command sent"
        ;;
    off)
        log "Turning TV OFF"
        echo 'standby 0' | cec-client -s -d 1
        log "TV OFF command sent"
        ;;
    status)
        log "Checking TV status"
        echo 'pow 0' | cec-client -s -d 1
        ;;
    *)
        echo "Usage: $0 {on|off|status}"
        exit 1
        ;;
esac
