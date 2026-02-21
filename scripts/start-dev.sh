#!/bin/bash
set -euo pipefail

# Kiosk App Development Server Manager (Enhanced)
# Manages both frontend (Vite) and backend (Node.js) servers
# Usage: ./scripts/start-dev.sh [start|stop|restart|status]

readonly SCRIPT_NAME="$(basename "$0")"
readonly SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly FRONTEND_PORT=3000
readonly BACKEND_PORT=3001
readonly KILL_TIMEOUT=3

# PID file locations
readonly PID_DIR="/tmp/kiosk-dev"
readonly FRONTEND_PID_FILE="$PID_DIR/frontend.pid"
readonly BACKEND_PID_FILE="$PID_DIR/backend.pid"

log() {
    echo "[$SCRIPT_NAME] $*" >&2
}

ensure_pid_dir() {
    mkdir -p "$PID_DIR"
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

stop_server_by_port() {
    local port="$1"
    local name="$2"

    if ! port_in_use "$port"; then
        log "No $name server running on port $port"
        return 0
    fi

    local pids
    pids=$(get_pids_on_port "$port")

    if [[ -z "$pids" ]]; then
        log "No $name processes found on port $port"
        return 0
    fi

    log "Stopping $name server on port $port..."
    for pid in $pids; do
        terminate_process "$pid"
    done

    sleep 1
    if port_in_use "$port"; then
        log "Error: Failed to stop $name server on port $port"
        return 1
    fi

    log "$name server stopped"
    return 0
}

stop_backend() {
    if [[ -f "$BACKEND_PID_FILE" ]]; then
        local pid
        pid=$(cat "$BACKEND_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            terminate_process "$pid"
        fi
        rm -f "$BACKEND_PID_FILE"
    fi
    stop_server_by_port "$BACKEND_PORT" "Backend"
}

stop_frontend() {
    if [[ -f "$FRONTEND_PID_FILE" ]]; then
        local pid
        pid=$(cat "$FRONTEND_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            terminate_process "$pid"
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    stop_server_by_port "$FRONTEND_PORT" "Frontend"
}

stop_all() {
    log "Stopping all dev servers..."
    stop_backend
    stop_frontend
    log "All servers stopped"
}

start_backend() {
    if port_in_use "$BACKEND_PORT"; then
        log "Backend port $BACKEND_PORT is in use. Stopping existing server..."
        stop_backend
    fi

    log "Starting backend server on port $BACKEND_PORT..."
    cd "$PROJECT_ROOT/server"

    # Start backend in background with output to log file
    npm run dev > /tmp/kiosk-dev-backend.log 2>&1 &
    local backend_pid=$!
    echo "$backend_pid" > "$BACKEND_PID_FILE"

    log "Backend server started (PID: $backend_pid)"

    # Wait a moment and verify it started
    sleep 2
    if ! kill -0 "$backend_pid" 2>/dev/null; then
        log "Error: Backend server failed to start. Check /tmp/kiosk-dev-backend.log"
        return 1
    fi

    log "Backend server running on http://localhost:$BACKEND_PORT"
}

start_frontend() {
    if port_in_use "$FRONTEND_PORT"; then
        log "Frontend port $FRONTEND_PORT is in use. Stopping existing server..."
        stop_frontend
    fi

    log "Starting frontend server on port $FRONTEND_PORT..."
    cd "$PROJECT_ROOT"

    # Frontend runs in foreground so we can see logs
    npm run dev -- --port "$FRONTEND_PORT"
}

start_all() {
    ensure_pid_dir

    # Start backend first
    start_backend || {
        log "Failed to start backend server"
        exit 1
    }

    # Setup trap to kill backend when frontend exits
    trap 'stop_backend' EXIT INT TERM

    # Start frontend (this blocks until Ctrl+C)
    start_frontend
}

show_status() {
    log "=== Development Server Status ==="

    # Check frontend
    if port_in_use "$FRONTEND_PORT"; then
        local pids
        pids=$(get_pids_on_port "$FRONTEND_PORT")
        log "Frontend: RUNNING on port $FRONTEND_PORT (PID: $pids)"
        log "          URL: http://localhost:$FRONTEND_PORT"
    else
        log "Frontend: NOT RUNNING"
    fi

    # Check backend
    if port_in_use "$BACKEND_PORT"; then
        local pids
        pids=$(get_pids_on_port "$BACKEND_PORT")
        log "Backend:  RUNNING on port $BACKEND_PORT (PID: $pids)"
        log "          URL: http://localhost:$BACKEND_PORT"
        log "          Health: http://localhost:$BACKEND_PORT/api/health"
    else
        log "Backend:  NOT RUNNING"
    fi
}

usage() {
    cat << EOF
Usage: $SCRIPT_NAME [COMMAND]

Manage the Kiosk App development servers (frontend + backend).

Commands:
  start     Start both dev servers (default)
  stop      Stop both dev servers
  restart   Restart both dev servers
  status    Check server status

Examples:
  $SCRIPT_NAME                 # Start both servers
  $SCRIPT_NAME start           # Start both servers
  $SCRIPT_NAME stop            # Stop both servers
  $SCRIPT_NAME restart         # Restart both servers
  $SCRIPT_NAME status          # Show status

Server Details:
  Frontend: Vite dev server on port $FRONTEND_PORT
  Backend:  Node.js server on port $BACKEND_PORT
  Logs:     /tmp/kiosk-dev-backend.log (backend only)

Note: Frontend runs in foreground (Ctrl+C stops both servers)
      Backend runs in background and stops automatically on exit

EOF
}

main() {
    local command="${1:-start}"

    case $command in
        start)
            start_all
            ;;
        stop)
            stop_all
            ;;
        restart)
            stop_all
            sleep 1
            start_all
            ;;
        status)
            show_status
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log "Error: Unknown command '$command'"
            usage
            exit 1
            ;;
    esac
}

main "$@"
