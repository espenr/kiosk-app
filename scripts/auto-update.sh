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
            rm -rf "${versions[$i]}"
        done
    fi
}

restart_services() {
    log "Restarting kiosk services..."

    # Restart photo server if running
    if systemctl is-active --quiet kiosk-photos; then
        sudo systemctl restart kiosk-photos
        log "Restarted kiosk-photos service"
    fi

    # Refresh kiosk browser (send F5 to Chromium)
    if command -v xdotool &> /dev/null; then
        export DISPLAY=:0
        xdotool key F5 2>/dev/null || true
        log "Sent refresh to browser"
    fi
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

        # Move to versioned directory
        mv "$STAGING_DIR" "$RELEASES_DIR/$latest"
        log "Extracted to $RELEASES_DIR/$latest"

        # Install server dependencies
        if [[ -f "$RELEASES_DIR/$latest/server/package.json" ]]; then
            log "Installing server dependencies..."
            cd "$RELEASES_DIR/$latest/server"
            npm install --omit=dev 2>/dev/null || npm install --production
        fi
    fi

    # Update symlink atomically
    ln -sfn "$RELEASES_DIR/$latest" "${CURRENT_LINK}.new"
    mv -T "${CURRENT_LINK}.new" "$CURRENT_LINK"

    success "Updated to version $latest"

    cleanup_old_versions
    restart_services

    success "Deployment complete!"
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

    # Update symlink
    ln -sfn "$RELEASES_DIR/$previous" "${CURRENT_LINK}.new"
    mv -T "${CURRENT_LINK}.new" "$CURRENT_LINK"

    success "Rolled back to version $previous"

    restart_services
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
