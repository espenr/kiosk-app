# Automatic Deployment to Raspberry Pi

## Overview

Set up automatic deployment to the Pi when code is pushed to the main branch.

**Approach**: Pi polls GitHub for new releases (no internet exposure required)

```
Push to main → GitHub Actions builds → Creates release → Pi polls → Downloads & deploys
```

## Architecture

```
Developer                 GitHub                      Raspberry Pi
    │                        │                             │
    │  git push main         │                             │
    │───────────────────────>│                             │
    │                        │                             │
    │                 GitHub Actions                       │
    │                 - npm ci                             │
    │                 - npm run build                      │
    │                 - Create release                     │
    │                        │                             │
    │                        │      (every 5 min)          │
    │                        │<────────────────────────────│
    │                        │  Poll for new release       │
    │                        │                             │
    │                        │  Download kiosk-app.tar.gz  │
    │                        │────────────────────────────>│
    │                        │                             │
    │                        │                     Deploy atomically
    │                        │                     - Extract to staging
    │                        │                     - Symlink swap
    │                        │                     - Restart services
    │                        │                     - Health check
```

## Why This Approach

- **No internet exposure**: Pi initiates all connections, no port forwarding needed
- **No build on Pi**: Pi Zero W 2 (512MB RAM) is slow for npm/tsc builds
- **Atomic deploys**: Symlink swap prevents partial deployments
- **Rollback support**: Keeps 3 versions, auto-rollback on health check failure

## Files to Create

### 1. `.github/workflows/release.yml`

GitHub Actions workflow that:
- Triggers on push to main
- Builds frontend (`npm run build`)
- Builds server (`cd server && npm run build`)
- Creates release with `kiosk-app.tar.gz` artifact
- Uses date-based version tags: `v2024.02.16.1`

### 2. `scripts/auto-update.sh`

Pi-side polling script that:
- Polls GitHub API for latest release every 5 minutes
- Compares with currently installed version
- Downloads and extracts new release to staging
- Installs server dependencies (`npm install --omit=dev`)
- Preserves `.env` file
- Performs atomic symlink swap
- Restarts `kiosk-photos` and reloads `nginx`
- Runs health check, auto-rollback on failure
- Cleans up old versions (keeps 3)

Commands:
- `auto-update.sh update` - Check and deploy new version
- `auto-update.sh rollback [version]` - Rollback to previous
- `auto-update.sh status` - Show current version

### 3. `scripts/kiosk-updater.service`

Systemd oneshot service that runs the update script.

### 4. `scripts/kiosk-updater.timer`

Systemd timer that triggers update check:
- 2 minutes after boot
- Every 5 minutes thereafter
- 30 second random delay (avoid API thundering herd)

### 5. `scripts/setup-auto-deploy.sh`

One-time Pi setup script that:
- Creates `/var/www/kiosk-releases/` directory
- Migrates existing install to versioned structure
- Configures sudoers for passwordless service restarts
- Installs and enables systemd timer

## Directory Structure (on Pi)

```
/var/www/kiosk                 → symlink to current version
/var/www/kiosk-releases/
├── v2024.02.16.1/            # Previous version
├── v2024.02.16.2/            # Current version
└── staging/                   # New version during deploy
/var/log/kiosk-deploy.log      # Deployment history
```

## Implementation Order

1. Create `.github/workflows/release.yml`
2. Push and verify GitHub Actions creates release
3. Create `scripts/auto-update.sh`
4. Create `scripts/kiosk-updater.service` and `.timer`
5. Create `scripts/setup-auto-deploy.sh`
6. Deploy scripts manually: `npm run deploy`
7. Run setup on Pi: `sudo bash /var/www/kiosk/scripts/setup-auto-deploy.sh`

## Verification

1. **GitHub Actions**: Push to main, verify release created with artifact
2. **Timer active**: `systemctl list-timers kiosk-updater.timer`
3. **Manual test**: `/var/www/kiosk/scripts/auto-update.sh update`
4. **View logs**: `journalctl -u kiosk-updater -f`
5. **End-to-end**: Push change, wait ~5 min, verify live on Pi
6. **Rollback test**: `/var/www/kiosk/scripts/auto-update.sh rollback`

## Files Modified

- `docs/architecture/raspberry-pi-infrastructure.md` - Document auto-deploy setup
