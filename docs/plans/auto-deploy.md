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
- **No build on Pi**: Pi 2 Model B (1GB RAM) is slow for npm/tsc builds
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
- Restarts `kiosk-photos` systemd service
- **Waits for backend health check** (max 30s)
- **Sends hard refresh to browser** (Ctrl+F5) only after backend ready
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

## Clean Start on Deployment

**Problem**: Browser cache and localStorage can cause issues after deployment (stale data, version mismatches, cached errors).

**Solution**: Automatic clean start on version changes

### 1. Server-side: Browser Refresh After Health Check

The auto-update script ensures the browser only loads new code when backend is ready:

```bash
# In scripts/auto-update.sh
restart_services() {
    sudo systemctl restart kiosk-photos  # Restart backend

    # Wait for backend health check (max 30s)
    while ! curl -sf http://localhost:3001/api/health; do
        sleep 1
    done

    # THEN refresh browser (after backend confirmed ready)
    xdotool key ctrl+F5
}
```

**Benefits:**
- No race condition (frontend loads when backend ready)
- Reduced deployment window (~3-5s instead of ~14s)
- Prevents "photo slideshow stuck in error state" issue

### 2. Client-side: Automatic localStorage Clearing

The frontend automatically clears localStorage when version changes:

**Bootstrap check** (`src/main.tsx` → `src/utils/versionBootstrap.ts`):
```typescript
async function bootstrap() {
    // Before React mounts, check version
    const currentVersion = await fetch('/api/version');
    const lastVersion = localStorage.getItem('__kiosk_app_version__');

    if (lastVersion !== currentVersion) {
        console.log('Version changed, clearing localStorage');
        localStorage.clear();
        localStorage.setItem('__kiosk_app_version__', currentVersion);
    }

    // Mount React with clean state
    ReactDOM.createRoot(rootElement).render(<App />);
}
```

**Runtime polling** (`src/hooks/useVersionCheck.ts`):
```typescript
// Poll every 30s for version changes (user left app open)
setInterval(async () => {
    const newVersion = await checkVersion();
    if (newVersion !== currentVersion) {
        localStorage.clear();
        localStorage.setItem('__kiosk_app_version__', newVersion);
        window.location.reload();
    }
}, 30000);
```

**Benefits:**
- Prevents stale config from old versions
- Eliminates version migration bugs
- Ensures config is fetched fresh from server
- Simpler debugging (known clean state after deploy)

**What gets cleared:**
- `kiosk-app:config` - Dashboard settings cache
- `kiosk-app:app-state` - Application state
- All other localStorage keys
- **Preserved:** `__kiosk_app_version__` (version tracking key)

**What doesn't get cleared:**
- Server-side config (`/var/www/kiosk/server/data/config.internal.json`)
- Admin view settings (stored server-side, encrypted)

### Deployment Flow with Clean Start

```
1. GitHub Actions: Build & create release
2. Pi: Poll, download, extract
3. Pi: Restart kiosk-photos systemd service
4. Pi: Poll health endpoint (max 30s): http://localhost:3001/api/health
5. Pi: Send Ctrl+F5 to browser (hard refresh)
6. Browser: Fetch /api/version
7. Browser: Check localStorage version
8. Browser: Version changed? → Clear localStorage
9. Browser: Mount React with clean state
10. Browser: Fetch fresh config from /api/config/public
11. All widgets load successfully with no stale data
```

## Files Modified

- `docs/architecture/raspberry-pi-infrastructure.md` - Document auto-deploy setup
- `scripts/auto-update.sh` - Fixed race condition, added health check before refresh
- `src/main.tsx` - Added bootstrap with version check
- `src/utils/versionBootstrap.ts` - Version check and localStorage clearing
- `src/hooks/useVersionCheck.ts` - Clear localStorage before reload
