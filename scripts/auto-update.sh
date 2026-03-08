#!/bin/bash
#
# Kiosk App Auto-Update Script
# Polls GitHub releases and deploys new versions automatically
#
# Usage:
#   auto-update.sh update    - Check for updates and deploy if available
#   auto-update.sh rollback  - Rollback to previous version
#   auto-update.sh status    - Show current version and available updates
#

set -e

# Configuration
REPO="espenr/kiosk-app"
RELEASES_DIR="/var/www/kiosk-releases"
CURRENT_LINK="/var/www/kiosk"
STAGING_DIR="$RELEASES_DIR/staging"
DATA_DIR="/var/www/kiosk-data"  # Shared data directory (persists across deployments)
MAX_VERSIONS=3  # Keep last N versions for rollback
LOG_FILE="/var/log/kiosk-updater.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

error() {
    log "${RED}ERROR: $1${NC}"
    exit 1
}

success() {
    log "${GREEN}$1${NC}"
}

warn() {
    log "${YELLOW}$1${NC}"
}

get_current_version() {
    if [[ -f "$CURRENT_LINK/VERSION" ]]; then
        cat "$CURRENT_LINK/VERSION"
    else
        echo "unknown"
    fi
}

get_latest_release() {
    curl -s "https://api.github.com/repos/$REPO/releases/latest" | \
        grep '"tag_name"' | \
        sed -E 's/.*"([^"]+)".*/\1/'
}

get_download_url() {
    curl -s "https://api.github.com/repos/$REPO/releases/latest" | \
        grep '"browser_download_url".*kiosk-app.tar.gz' | \
        sed -E 's/.*"([^"]+)".*/\1/'
}

ensure_directories() {
    mkdir -p "$RELEASES_DIR"
    mkdir -p "$(dirname "$LOG_FILE")"
    mkdir -p "$DATA_DIR"
}

setup_data_symlink() {
    local version_dir="$1"
    local data_link="$version_dir/server/data"

    # Remove existing data directory/symlink if it exists
    if [[ -e "$data_link" ]]; then
        if [[ -L "$data_link" ]]; then
            # Already a symlink, remove it
            rm "$data_link"
        elif [[ -d "$data_link" ]]; then
            # It's a real directory, migrate data to shared location
            log "Migrating data from $data_link to $DATA_DIR"
            cp -a "$data_link"/* "$DATA_DIR/" 2>/dev/null || true
            rm -rf "$data_link"
        fi
    fi

    # Create symlink to shared data directory
    ln -sf "$DATA_DIR" "$data_link"
    log "Linked $data_link -> $DATA_DIR"
}

cleanup_old_versions() {
    log "Cleaning up old versions..."
    cd "$RELEASES_DIR"

    # List version directories sorted by name (which includes date), keep only MAX_VERSIONS
    local versions=($(ls -d v* 2>/dev/null | sort -r))
    local count=${#versions[@]}

    if (( count > MAX_VERSIONS )); then
        for ((i=MAX_VERSIONS; i<count; i++)); do
            log "Removing old version: ${versions[$i]}"
            # Try with sudo first (for root-owned files), fall back to regular rm
            if ! sudo rm -rf "${versions[$i]}" 2>/dev/null; then
                # If sudo fails, try regular rm and ignore permission errors
                rm -rf "${versions[$i]}" 2>/dev/null || log "Warning: Could not fully remove ${versions[$i]} (permission denied)"
            fi
        done
    fi
}

restart_services() {
    log "Restarting kiosk services..."

    # Check that backend server file exists before restarting
    if [[ ! -f "$CURRENT_LINK/server/dist/index.js" ]]; then
        error "Backend server file not found: $CURRENT_LINK/server/dist/index.js"
    fi

    # Restart kiosk-photos systemd service (manages backend on port 3001)
    if systemctl is-active --quiet kiosk-photos; then
        log "Restarting kiosk-photos service..."
        sudo systemctl restart kiosk-photos
    else
        log "Starting kiosk-photos service..."
        sudo systemctl start kiosk-photos
    fi

    # Wait for backend to be fully ready before refreshing browser
    log "Waiting for backend to initialize..."
    local max_wait=30
    local wait_count=0
    local backend_ready=false

    while [ $wait_count -lt $max_wait ]; do
        if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
            backend_ready=true
            log "Backend ready after ${wait_count}s"
            break
        fi
        sleep 1
        ((wait_count++))
    done

    if ! $backend_ready; then
        error "Backend failed to become ready after ${max_wait}s. Check: sudo journalctl -u kiosk-photos -n 50"
    fi

    # Hard refresh kiosk browser (send Ctrl+F5 to clear cache)
    # Only refresh after backend is confirmed healthy
    if command -v xdotool &> /dev/null; then
        export DISPLAY=:0
        xdotool key --clearmodifiers ctrl+F5 2>/dev/null || true
        log "Sent hard refresh to browser"
    fi
}

verify_deployment() {
    local version="$1"
    log "Verifying deployment health..."

    # Give services time to fully initialize
    sleep 3

    # Check 1: Backend health endpoint
    log "Checking backend health endpoint..."
    local retries=5
    local health_ok=false

    for ((i=1; i<=retries; i++)); do
        if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
            health_ok=true
            break
        fi
        log "Health check attempt $i/$retries failed, retrying in 2s..."
        sleep 2
    done

    if ! $health_ok; then
        error "Backend health check failed after $retries attempts"
    fi

    log "Backend health check: OK"

    # Check 2: Backend version matches deployed version
    log "Verifying backend version..."
    local backend_version=$(curl -sf http://localhost:3001/api/version 2>/dev/null | grep -o '"version":"[^"]*"' | cut -d'"' -f4)

    if [[ "$backend_version" == "$version" ]]; then
        log "Backend version check: OK (v$backend_version)"
    else
        warn "Backend version mismatch (expected: $version, got: $backend_version)"
    fi

    # Check 3: Calendar API endpoint (critical widget dependency)
    log "Checking calendar API endpoint..."
    local calendar_status=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost:3001/api/calendar/events 2>/dev/null || echo "000")

    # Accept 200 (success), 401 (not configured), 500 (config error)
    # These all mean the backend is responding
    if [[ "$calendar_status" =~ ^(200|401|500)$ ]]; then
        log "Calendar API check: OK (HTTP $calendar_status)"
    else
        error "Calendar API check failed (HTTP $calendar_status)"
    fi

    # Check 4: Frontend is accessible via Nginx
    log "Checking frontend accessibility..."
    local frontend_status=$(curl -sf -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")

    if [[ "$frontend_status" == "200" ]]; then
        log "Frontend check: OK"
    else
        error "Frontend check failed (HTTP $frontend_status)"
    fi

    success "All health checks passed!"
}

cmd_update() {
    ensure_directories

    local current=$(get_current_version)
    log "Current version: $current"

    local latest=$(get_latest_release)
    if [[ -z "$latest" ]]; then
        error "Failed to fetch latest release from GitHub"
    fi
    log "Latest version: $latest"

    if [[ "$current" == "$latest" ]]; then
        success "Already running latest version ($current)"
        exit 0
    fi

    # Check if this version already exists
    if [[ -d "$RELEASES_DIR/$latest" ]]; then
        log "Version $latest already downloaded, switching to it..."
    else
        log "Downloading version $latest..."

        local url=$(get_download_url)
        if [[ -z "$url" ]]; then
            error "Failed to get download URL"
        fi

        # Download to staging
        rm -rf "$STAGING_DIR"
        mkdir -p "$STAGING_DIR"

        curl -L -o "$STAGING_DIR/kiosk-app.tar.gz" "$url"

        # Extract
        cd "$STAGING_DIR"
        tar -xzf kiosk-app.tar.gz
        rm kiosk-app.tar.gz

        # Preserve .env file from current installation
        if [[ -f "$CURRENT_LINK/.env" ]]; then
            cp "$CURRENT_LINK/.env" "$STAGING_DIR/.env"
            log "Preserved .env file"
        fi

        # Validate critical files after extraction
        if [[ ! -f "$STAGING_DIR/.env" ]]; then
            log "WARNING: .env file missing after deployment"
            log "Photo proxy may not work correctly"

            # Try to restore from config.public.json
            if [[ -f "$STAGING_DIR/server/data/config.public.json" ]]; then
                ALBUM_URL=$(jq -r '.photos.sharedAlbumUrl' "$STAGING_DIR/server/data/config.public.json" 2>/dev/null)
                if [[ -n "$ALBUM_URL" && "$ALBUM_URL" != "null" ]]; then
                    echo "ICLOUD_ALBUM_URL=$ALBUM_URL" > "$STAGING_DIR/.env"
                    log "Created .env from config.public.json"
                fi
            fi
        fi

        # Move to versioned directory
        mv "$STAGING_DIR" "$RELEASES_DIR/$latest"
        log "Extracted to $RELEASES_DIR/$latest"

        # Install server dependencies
        if [[ -f "$RELEASES_DIR/$latest/server/package.json" ]]; then
            log "Installing server dependencies..."
            cd "$RELEASES_DIR/$latest/server"

            # Try npm ci first (requires package-lock.json, more reliable)
            if [[ -f "package-lock.json" ]]; then
                if ! npm ci --omit=dev 2>&1 | tee -a "$LOG_FILE"; then
                    error "Failed to install server dependencies with npm ci"
                fi
            else
                # Fallback to npm install (for old releases without lock file)
                warn "No package-lock.json found, using npm install (less reliable)"
                if ! npm install --omit=dev 2>&1 | tee -a "$LOG_FILE"; then
                    error "Failed to install server dependencies with npm install"
                fi
            fi

            # Verify critical dependencies
            if [[ ! -d "node_modules/jsonwebtoken" ]]; then
                error "Critical dependency 'jsonwebtoken' not found after installation"
            fi

            log "Server dependencies installed successfully"
        fi

        # Set up data symlink
        setup_data_symlink "$RELEASES_DIR/$latest"
    fi

    # Update symlink atomically (requires sudo as /var/www is owned by root)
    sudo ln -sfn "$RELEASES_DIR/$latest" "${CURRENT_LINK}.new"
    sudo mv -T "${CURRENT_LINK}.new" "$CURRENT_LINK"

    success "Updated to version $latest"

    restart_services

    # Verify deployment health
    log "Running post-deployment health checks..."
    if ! verify_deployment "$latest"; then
        error "Health checks failed, initiating automatic rollback..."
        # Rollback is handled by error() function exiting
        # Manual rollback command: /var/www/kiosk/scripts/auto-update.sh rollback
        warn "Deployment failed. Previous version ($current) is still active."
        exit 1
    fi

    # Cleanup old versions (only after successful deployment)
    cleanup_old_versions

    success "Deployment complete and verified!"
}

cmd_rollback() {
    ensure_directories

    local current=$(get_current_version)
    log "Current version: $current"

    # Find previous version
    cd "$RELEASES_DIR"
    local versions=($(ls -d v* 2>/dev/null | sort -r))

    if (( ${#versions[@]} < 2 )); then
        error "No previous version available for rollback"
    fi

    # Find the version that isn't current
    local previous=""
    for v in "${versions[@]}"; do
        if [[ "$v" != "$current" ]]; then
            previous="$v"
            break
        fi
    done

    if [[ -z "$previous" ]]; then
        error "Could not determine previous version"
    fi

    log "Rolling back to: $previous"

    # Preserve .env file
    if [[ -f "$CURRENT_LINK/.env" ]]; then
        cp "$CURRENT_LINK/.env" "$RELEASES_DIR/$previous/.env"
    fi

    # Set up data symlink for rollback version
    setup_data_symlink "$RELEASES_DIR/$previous"

    # Update symlink (requires sudo as /var/www is owned by root)
    sudo ln -sfn "$RELEASES_DIR/$previous" "${CURRENT_LINK}.new"
    sudo mv -T "${CURRENT_LINK}.new" "$CURRENT_LINK"

    success "Rolled back to version $previous"

    restart_services

    # Verify rollback worked
    log "Verifying rollback health..."
    if ! verify_deployment "$previous"; then
        error "Rollback verification failed - system may be in degraded state"
    fi

    success "Rollback completed successfully"
}

cmd_status() {
    ensure_directories

    echo "Kiosk App Update Status"
    echo "========================"
    echo ""

    local current=$(get_current_version)
    echo "Current version: $current"
    echo "Install path:    $CURRENT_LINK -> $(readlink -f "$CURRENT_LINK" 2>/dev/null || echo "not linked")"
    echo ""

    local latest=$(get_latest_release)
    if [[ -n "$latest" ]]; then
        echo "Latest release:  $latest"
        if [[ "$current" == "$latest" ]]; then
            echo -e "Status:          ${GREEN}Up to date${NC}"
        else
            echo -e "Status:          ${YELLOW}Update available${NC}"
        fi
    else
        echo "Latest release:  Unable to fetch"
    fi
    echo ""

    echo "Installed versions:"
    if [[ -d "$RELEASES_DIR" ]]; then
        ls -d "$RELEASES_DIR"/v* 2>/dev/null | while read dir; do
            local v=$(basename "$dir")
            if [[ "$v" == "$current" ]]; then
                echo "  $v (active)"
            else
                echo "  $v"
            fi
        done
    else
        echo "  (none)"
    fi
}

# Main
case "${1:-update}" in
    update)
        cmd_update
        ;;
    rollback)
        cmd_rollback
        ;;
    status)
        cmd_status
        ;;
    *)
        echo "Usage: $0 {update|rollback|status}"
        exit 1
        ;;
esac
