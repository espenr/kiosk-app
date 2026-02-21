#!/bin/bash
set -euo pipefail

# Kiosk App Development Server Manager
# Usage: ./scripts/start-dev.sh [start|stop|restart|status]

readonly SCRIPT_NAME="$(basename "$0")"
readonly DEFAULT_PORT=3000
readonly KILL_TIMEOUT=3

log() {
    echo "[$SCRIPT_NAME] $*" >&2
}

port_in_use() {
    local port="$1"
    lsof -i ":${port}" > /dev/null 2>&1
}

get_pids_on_port() {
    local port="$1"
    lsof -ti ":${port}" 2>/dev/null || true
}

terminate_process() {
    local pid="$1"

    if ! kill -0 "$pid" 2>/dev/null; then
        return 0
    fi

    log "Stopping process $pid..."
    kill -TERM "$pid" 2>/dev/null || return 1

    local count=0
    while kill -0 "$pid" 2>/dev/null && [ $count -lt "$KILL_TIMEOUT" ]; do
        sleep 1
        count=$((count + 1))
    done

    if kill -0 "$pid" 2>/dev/null; then
        log "Force killing process $pid..."
        kill -KILL "$pid" 2>/dev/null || return 1
    fi

    return 0
}

stop_server() {
    local port="${1:-$DEFAULT_PORT}"

    if ! port_in_use "$port"; then
        log "No server running on port $port"
        return 0
    fi

    local pids
    pids=$(get_pids_on_port "$port")

    if [[ -z "$pids" ]]; then
        log "No processes found on port $port"
        return 0
    fi

    log "Stopping dev server on port $port..."
    for pid in $pids; do
        terminate_process "$pid"
    done

    sleep 1
    if port_in_use "$port"; then
        log "Error: Failed to stop server on port $port"
        return 1
    fi

    log "Server stopped"
    return 0
}

start_server() {
    local port="${1:-$DEFAULT_PORT}"

    if port_in_use "$port"; then
        log "Port $port is in use. Stopping existing server..."
        stop_server "$port"
    fi

    log "Starting Vite dev server on port $port..."
    cd "$(dirname "$0")/.."
    exec npm run dev -- --port "$port"
}

show_status() {
    local port="${1:-$DEFAULT_PORT}"

    if port_in_use "$port"; then
        local pids
        pids=$(get_pids_on_port "$port")
        log "Server RUNNING on port $port (PID: $pids)"
    else
        log "Server NOT RUNNING on port $port"
    fi
}

usage() {
    cat << EOF
Usage: $SCRIPT_NAME [COMMAND] [OPTIONS]

Manage the Kiosk App Vite development server.

Commands:
  start     Start the dev server (default)
  stop      Stop the dev server
  restart   Restart the dev server
  status    Check if server is running

Options:
  -p, --port PORT    Use specific port (default: $DEFAULT_PORT)
  -h, --help         Show this help message

Examples:
  $SCRIPT_NAME                 # Start on port $DEFAULT_PORT
  $SCRIPT_NAME start           # Start on port $DEFAULT_PORT
  $SCRIPT_NAME stop            # Stop the server
  $SCRIPT_NAME restart         # Restart the server
  $SCRIPT_NAME -p 3001         # Start on port 3001

EOF
}

main() {
    local command="start"
    local port="$DEFAULT_PORT"

    while [[ $# -gt 0 ]]; do
        case $1 in
            start|stop|restart|status)
                command="$1"
                shift
                ;;
            -p|--port)
                if [[ -n "${2:-}" ]] && [[ "$2" =~ ^[0-9]+$ ]]; then
                    port="$2"
                    shift 2
                else
                    log "Error: --port requires a numeric argument"
                    exit 1
                fi
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                log "Error: Unknown option '$1'"
                usage
                exit 1
                ;;
        esac
    done

    case $command in
        start)
            start_server "$port"
            ;;
        stop)
            stop_server "$port"
            ;;
        restart)
            stop_server "$port"
            sleep 1
            start_server "$port"
            ;;
        status)
            show_status "$port"
            ;;
    esac
}

main "$@"
