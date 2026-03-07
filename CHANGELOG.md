# Changelog

All notable changes to this project will be documented in this file.

## [2026-03-07] - Calendar Service Account Authentication

### Discovered
- **Calendar widget uses Service Account authentication**: Implementation correctly uses Google Service Account with JWT (not OAuth 2.0 refresh tokens)
- **Outdated documentation**: Multiple docs incorrectly describe OAuth flow (`widget-calendar.md`, `README-calendar-oauth.md`, CLAUDE.md Google Calendar section)
- **Service account email**: `pi-537@familycalendar-489421.iam.gserviceaccount.com` from project `familycalendar-489421`

### Required Setup
- **Critical step**: Each calendar owner must share their Google Calendar with service account email for read access
- **Permission level**: "See all event details" required (not just free/busy)
- **Common error**: 401 Unauthorized if calendars not shared → backend logs show "invalid authentication credentials"

### Added
- `docs/architecture/calendar-service-account-setup.md` - Complete service account setup guide
  - Why service account (not OAuth)
  - Step-by-step sharing instructions
  - Troubleshooting guide
  - Security best practices

### Technical Details
- Backend generates JWT signed with service account private key (RS256)
- JWT exchanged for 1-hour access token from Google OAuth endpoint
- Token cached in memory with 5-minute renewal buffer
- Credentials stored base64-encoded in `server/data/config.internal.json`
- Scope: `https://www.googleapis.com/auth/calendar.readonly`

## [2026-03-04] - Raspberry Pi 2 Screen Blanking Fix

### Fixed
- **Screen blanking and login screen after idle time**: LightDM was locking session after ~10 minutes, showing login greeter
- **Automatic service startup**: Changed systemd target from `graphical.target` to `default.target` for user services

### Changed
- LightDM X server command: Added `-s 0 -dpms` flags to disable screen blanking and DPMS at X server level
- LXDE autostart: Removed `@xscreensaver -no-splash` line to prevent screensaver from running
- kiosk.service: Added `ExecStartPre=/usr/bin/xset s off -dpms` for additional screen blanking prevention
- kiosk.service: Changed `WantedBy=graphical.target` to `WantedBy=default.target`

### Added
- `docs/pi2-screen-blanking-fix.md` - Documentation of screen blanking fix

### Technical Details
- Multi-layer protection: X server flags + xset command + no xscreensaver process
- DPMS extension disabled at X server level (server reports "does not have the DPMS Extension")
- Screen saver timeout set to 0 (disabled)
- No scheduled tasks or scripts that turn off display at night

## [2026-03-04] - Raspberry Pi 2 Model B Keyring Dialog Fix

### Fixed
- **Chromium keyring dialog blocking kiosk on boot**: Migrated from LXDE autostart to systemd user service with proper environment isolation
- **Unreliable kiosk startup**: Systemd service now manages Chromium lifecycle with auto-restart on crash

### Changed
- Chromium launch method: LXDE autostart → systemd user service (`~/.config/systemd/user/kiosk.service`)
- Enabled `loginctl enable-linger` for user services to start at boot
- LXDE autostart cleaned up: removed Chromium and xrandr commands (now in systemd)
- Disabled GNOME keyring daemon autostart via `~/.config/autostart/*.desktop` files
- Deleted old keyring files to prevent password prompts

### Added
- `docs/pi2-keyring-fix.md` - Complete documentation of keyring fix implementation
- `scripts/kiosk-service.sh` - Management script for systemd kiosk service (status, restart, logs, verify)

### Technical Details
- Systemd service includes 5-second delay for X server initialization
- Environment variables set: DISPLAY, XAUTHORITY, DBUS_SESSION_BUS_ADDRESS
- Service restarts automatically on crash with 3-second delay
- Screen rotation (xrandr) runs before Chromium starts
- Chromium flags: `--kiosk`, `--password-store=basic`, `--noerrdialogs`, `--disable-infobars`

## [2026-02-19] - Data Persistence Fix

### Fixed
- **Data persistence across deployments**: Config data now stored in shared location `/var/www/kiosk-data/`
- Auto-deploy and manual deploy both preserve data across version updates
- Automatic migration of existing data directories to shared location

### Changed
- `server/data/` is now a symlink to `/var/www/kiosk-data/` in all releases
- Updated `scripts/auto-update.sh` to set up data symlinks automatically
- Updated `scripts/deploy.sh` to ensure data symlink exists

## [2026-02-19] - Archive Phase Test Scripts

### Changed
- Archived 5 phase test scripts to `docs/archive/implementation-history/`
  - `test-backend.sh`, `test-phase4.sh`, `test-phase5.sh`, `test-phase6.sh`, `test-phase7.sh`
- Added `.DS_Store` to `.gitignore`

### Removed
- `tests/.DS_Store` (macOS metadata file)

### Kept
- `scripts/verify-pi-config.sh` - Still useful for Pi diagnostics

## [2026-02-19] - Test Cleanup

### Removed
- **Obsolete test files** for old widget-based architecture:
  - `public/puppeteer-test.html`, `public/test.html` (old widget test pages)
  - `tests/puppeteer/` directory (5 Puppeteer test files for old widgets)
  - `tests/start-and-test.js` (test runner referencing deleted files)
  - `tests/state-management-test.html` (old state management tests)
- **Total removed:** 8 test files (~40 KB)

### Changed
- Rewrote `tests/README.md` to reflect current testing approach
- Documented manual testing procedures for fixed-layout architecture
- Explained why automated browser tests were removed

## [2026-02-19] - Documentation Cleanup & Audit

### Removed
- **15 obsolete documentation files** describing old widget-based architecture:
  - Root level: `PROJECT_KNOWLEDGE.md`, `requirements.md`, `MANUAL-TEST-GUIDE.md`
  - docs/ main: `CURRENT_STATUS.md`, `OPTIMIZATION_RESULTS.md`, `TECH_STACK_AUDIT.md`, `WIDGET_DEVELOPMENT_GUIDE.md`, `WIDGET_DEVELOPMENT_CHECKLIST.md`
  - docs/widgets/: Entire directory (old widget design docs)
  - tests/: `TASK_*.md` test plans, `TEST_2.1_RESULTS.md`, `manual/` directory
- **1 obsolete directory**: `docs/summaries/` (early development summaries)

### Changed
- Archived historical implementation documentation (PHASE*.md, SESSION*.md files) to `docs/archive/implementation-history/`
- Updated CLAUDE.md to reflect completion of Phase 7 (Admin View implementation)
- All admin view phases (4-7) are now marked as complete
- **Documentation reduction**: 42 files → 20 files (52% reduction, excluding archive)

### Added
- `docs/DOCUMENTATION_AUDIT.md` - Comprehensive audit report
- `docs/archive/implementation-history/README.md` - Archive index

## [2026-02-19] - Deployment Architecture Fix

### Fixed
- **Inconsistent deployment directory structures**: Manual deploy (`deploy.sh`) now creates `/var/www/kiosk/dist/` instead of flattening files to `/var/www/kiosk/`, matching auto-deploy behavior
- **Nginx configuration conflicts**: Single Nginx configuration (`root /var/www/kiosk/dist;`) now works for both manual and auto-deploy methods

### Changed
- `scripts/deploy.sh`: Changed rsync destination from `$PI_DIR/` to `$PI_DIR/dist/` to preserve dist/ subdirectory
- `scripts/setup-photo-server.sh`: Added automatic Nginx root verification and correction
- Nginx configuration: Updated to consistently point to `/var/www/kiosk/dist`

### Added
- `docs/architecture/deployment.md`: Comprehensive deployment architecture documentation
- Directory structure documentation in `docs/architecture/raspberry-pi-infrastructure.md`
- Deployment architecture section in `CLAUDE.md`

### Migration
- Existing installations: Run `sudo sed -i 's|root /var/www/kiosk;|root /var/www/kiosk/dist;|' /etc/nginx/sites-available/default && sudo systemctl reload nginx`
- Clean up old root-level files: `cd /var/www/kiosk && sudo rm -rf index.html test.html puppeteer-test.html assets/`
