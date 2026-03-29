# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Commands

### Development
- `./scripts/start-dev.sh` - Start both frontend and backend servers (recommended)
  - Frontend: Vite dev server on port 3002
  - Backend: Node.js server on port 3003
  - Use `./scripts/start-dev.sh status` to check running servers
  - Use `./scripts/start-dev.sh stop` to stop all servers
- `npm run dev` - Start frontend only (backend must be started separately)
- `npm run build` - Build for production (TypeScript compilation + Vite build)
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint on TypeScript/TSX files
- `npm run typecheck` - Run TypeScript type checking without emitting files

### Testing
- `npm test` - Run Puppeteer automated tests
- `npm run start-tests` - Start dev server and show test options menu
- `npm run test:manual` - Start dev server for manual testing
- `npm run run-puppeteer-test` - Run Puppeteer tests via shell script

### TV Screenshot Workflow

To capture screenshots of the actual TV display (not browser simulation):

```bash
# Capture screenshot from Raspberry Pi display
ssh pi@pi.local 'DISPLAY=:0 scrot /tmp/screen.png' && scp pi@pi.local:/tmp/screen.png /tmp/kiosk-screenshot.png

# Then read the screenshot
# Read tool: /tmp/kiosk-screenshot.png
```

**Important:** This captures the actual framebuffer output from the Pi's HDMI display, showing exactly what appears on the 32" portrait TV (1080x1920px native resolution).

### Deployment
- `npm run deploy` - Build and deploy to Raspberry Pi via rsync
  - Target: `pi@192.168.50.37:/var/www/kiosk/`
  - SSH key auth required (see README.md for setup)

## Tech Stack
- **Frontend:** Preact (via React alias) + TypeScript + Vite
- **Styling:** Tailwind CSS (utility-first, static CSS, no runtime)
- **State:** React Context API + localStorage
- **Testing:** Puppeteer for browser automation
- **Build:** Vite with Preact alias, path alias '@' -> 'src'
- **Target Device:** Raspberry Pi 2 Model B (1GB RAM, quad-core ARMv7)
- **Bundle Size:** ~66 KB (13 KB CSS + 53 KB JS)

## Deployment Architecture

**Directory Structure:** All deployments follow the standard structure documented in [`docs/architecture/deployment.md`](./docs/architecture/deployment.md)

**Critical:** Nginx always serves from `/var/www/kiosk/dist/` regardless of deployment method (manual or auto-deploy).

**Key Files:**
- Frontend: `/var/www/kiosk/dist/` (Nginx root)
- Backend: `/var/www/kiosk/server/dist/` (Node.js on port 3003)
- Environment: `/var/www/kiosk/.env`
- Runtime Data: `/var/www/kiosk/server/data/` (encrypted config, auth, machine secret)

See deployment guide: [`docs/DEPLOYMENT_GUIDE.md`](./docs/DEPLOYMENT_GUIDE.md)

## Architecture

### Fixed-Layout Dashboard
The application uses a fixed vertical layout optimized for a 32" portrait TV (1080x1920px native resolution).

**Layout Sections** (`src/components/layout/DashboardLayout.tsx`):
- **Header** (8%): Clock, date, weather - `src/components/sections/Header/`
- **Photo + Calendar** (74%): Side-by-side split - `src/components/sections/PhotoSlideshow/`, `src/components/sections/Calendar/`
- **Electricity** (8%): Current price, hourly chart - `src/components/sections/Electricity/`
- **Transport** (10%): Bus departures - `src/components/sections/Transport/`

### Service/Hook Pattern
Each data source follows a consistent pattern:
1. **Service** (`src/services/*.ts`) - API calls, data types, helper functions
2. **Hook** (`src/hooks/use*.ts`) - State management, caching, auto-refresh

| Feature | Service | Hook | API |
|---------|---------|------|-----|
| Weather | `weather.ts` | `useWeather.ts` | Met.no |
| Transport | `entur.ts` | `useTransport.ts` | Entur GraphQL |
| Electricity | `tibber.ts` | `useElectricity.ts` | Tibber GraphQL |
| Calendar | `calendar.ts` | `useCalendar.ts` | Google Calendar |
| Photos | `photos.ts` | `usePhotos.ts` | Backend Proxy → iCloud |

### State Management
- **ConfigContext** (`src/contexts/ConfigContext.tsx`): API keys, location, settings
- LocalStorage persistence via `src/utils/storage.ts`
- No widget system - sections are fixed components

### Build Configuration
- Preact alias in `vite.config.ts`: `'react' -> 'preact/compat'`, `'react-dom' -> 'preact/compat'`
- Tailwind CSS via PostCSS (`postcss.config.js`, `tailwind.config.js`)
- Path alias: `'@' -> 'src'`

### Icon Strategy

The app uses **official Met.no weather icons** and **Lucide React** for UI elements to ensure consistent cross-platform rendering.

**Weather Icons** (`src/assets/weather-icons/`):
- 62 official Met.no SVG icons from https://github.com/metno/weathericons
- Icons match Met.no API symbol codes exactly (e.g., `clearsky_day.svg`, `rain.svg`, `partlycloudy_night.svg`)
- Imported as raw SVG files via Vite glob imports for optimal bundling
- `WeatherIcon` component (`src/components/icons/WeatherIcon.tsx`) handles rendering with fallback

**UI Icons** (`lucide-react`):
- Minimal tree-shaken imports: `Sun`, `Moon`, `Circle`, `AlertTriangle`, arrow components
- Used for: wind direction arrows, day/night indicators, realtime connection dots
- `WindArrow` component (`src/components/icons/WindArrow.tsx`) for directional arrows

**Why not emojis?**
- Unicode emojis render differently on macOS (colorful) vs Raspberry Pi (monochrome/missing)
- SVG icons ensure pixel-perfect consistency across all platforms
- Professional appearance matching official Yr.no website design

**Bundle impact**: +8.4 KB gzipped (39.95 KB total, acceptable for Pi 2 Model B)

### Calendar Glassmorphism Design

The calendar uses a glassmorphism/frosted glass effect optimized for Raspberry Pi 2 performance.

**Current Phase:** Phase 1: Subtle Glass (8px blur)

**Glass Effects:**
- Calendar container: `backdrop-blur` (8px) with `bg-gray-900/30`
- Day headers: `backdrop-blur` (8px) with `bg-gray-800/50`
- Event cards: `backdrop-blur-sm` (4px) with `bg-white/10`

**Event Card Design:**
- Colored dot (8px circle) indicates calendar ownership
- Glass background instead of solid calendar colors
- White text for contrast against semi-transparent background
- Layout: [Dot] [Icon] Time + Title

**Performance Characteristics:**
- Blur level: 8px (Phase 1)
- GPU temperature: <70°C (monitored)
- Memory: <250MB Chromium

**Phase 2 Upgrade Path:**
After 24 hours of successful Phase 1 monitoring:
- Upgrade to `backdrop-blur-md` (12px) for enhanced depth
- Add multi-layer dark overlay (`bg-gray-900/20`)
- Add GPU optimization CSS (will-change, translateZ)
- Monitor GPU temperature <75°C

**Rollback:**
If performance issues arise, revert to solid event card backgrounds or disable blur via CSS.

**Testing:**
Screenshot capture: `ssh pi@pi.local 'DISPLAY=:0 scrot /tmp/screen.png'`

## Photo Slideshow Backend Proxy

The photo slideshow fetches images from an iCloud Shared Album via a Node.js backend proxy that handles URL expiration automatically.

### Architecture
```
Frontend → Nginx /api/* → Node.js :3001 → iCloud SharedStreams API
```

**Components:**
- `server/` - Node.js proxy server (native HTTP, no Express)
- `src/services/photos.ts` - Frontend service (fetches from `/api/photos`)
- `src/hooks/usePhotos.ts` - React hook with 5-min client cache

### How It Works
1. Frontend requests `/api/photos` from Node.js server
2. Server checks in-memory cache (45-min TTL)
3. If cache miss/stale: fetches fresh URLs from iCloud API
4. Returns photo URLs to frontend with cache metadata
5. Frontend displays photos with crossfade/Ken Burns effects

### Why Backend Proxy?
iCloud photo URLs expire after ~2 hours (401 Unauthorized). The backend proxy:
- Caches URLs for 45 minutes (well before expiry)
- Serves stale data up to 90 minutes if iCloud is unavailable
- Handles URL refresh automatically without cron jobs

### Development
```bash
# Recommended: Start both servers with single command
./scripts/start-dev.sh

# This starts:
# - Frontend (Vite) on http://localhost:3000
# - Backend (Node.js) on http://localhost:3001
# - Vite proxies /api/* requests to backend automatically
#
# Backend logs: /tmp/kiosk-dev-backend.log
# Press Ctrl+C to stop both servers

# Alternative: Start manually (if needed)
npm run dev                    # Frontend on :3000
cd server && npm run dev       # Backend on :3001
```

### Setup on Pi
```bash
# Configure album URL
echo 'ICLOUD_ALBUM_URL=https://www.icloud.com/sharedalbum/#TOKEN' > /var/www/kiosk/.env

# Run setup script (installs systemd service, configures Nginx)
sudo bash /var/www/kiosk/scripts/setup-photo-server.sh

# Verify
curl http://localhost/api/health
```

**Directory structure after deployment:**
- Frontend: `/var/www/kiosk/dist/` (served by Nginx)
- Backend: `/var/www/kiosk/server/` (Node.js on port 3003)
- Environment: `/var/www/kiosk/.env`

### Fallback
If the Node.js server fails, `scripts/sync-photos.sh` can still generate static `photos.json` manually. The frontend falls back to this file if the API is unavailable.

See [Photo Slideshow Architecture](/docs/architecture/photo-slideshow.md) for detailed documentation.

## Code Style
- TypeScript for all new code, avoid `any` type
- camelCase for variables/functions, PascalCase for components/types
- Functional components with hooks (not class components)
- Tailwind CSS classes for all styling, no inline styles except for dynamic values
- Group imports: external -> internal -> styles
- Use Prettier for formatting (default config)

## UI Debugging

When encountering CSS layout issues, follow the systematic methodology documented in [`docs/development/ui-debugging-methodology.md`](./docs/development/ui-debugging-methodology.md).

**Key principle:** Always measure first using browser DevTools before writing code. Never guess at CSS solutions.

## Pre-Commit Checklist
**Always run before committing:**
```bash
npm run typecheck && npm run lint
```
This ensures CI will pass. Both commands must succeed with zero errors/warnings.

## Testing Notes
- Puppeteer tests run with `--no-sandbox` flag for Ubuntu 23.10+ compatibility
- Manual test pages available at `/tests/manual/`
- Screenshots saved to `/tests/screenshots/`
- See `/tests/README.md` for detailed testing documentation

## Development Workflow
1. App.tsx defines fixed layout with section components
2. Sections use hooks to fetch and manage data
3. Configuration persists to localStorage via ConfigContext
4. Add new sections by creating component + service + hook

## Current Development Plan

See full implementation plan: [`/docs/plans/kiosk-redesign.md`](./docs/plans/kiosk-redesign.md)

### Summary
- **Target:** 32" TV in portrait orientation (1080x1920px)
- **Layout:** Fixed vertical sections (Header 10%, Photo+Calendar 72%, Electricity 8%, Transport 10%)
- **APIs:** Met.no (weather), Google Calendar, Tibber (electricity), Entur (transport), iCloud Shared Album

### Implementation Phases
- Phase 0: Documentation Setup - **COMPLETE**
- Phase 1: Cleanup & Fixed Layout - **COMPLETE**
- Phase 2: Header Section (Clock, Date, Weather) - **COMPLETE**
- Phase 3: Transport Section (Entur) - **COMPLETE**
- Phase 4: Electricity Section (Tibber) - **COMPLETE**
- Phase 5: Calendar Section (Google Calendar) - **COMPLETE**
- Phase 6: Photo Slideshow (iCloud) - **COMPLETE**
- Phase 7: Settings & Polish (Admin View) - **COMPLETE**

## Google Calendar Service Account Integration

The calendar widget uses **Google Service Account authentication** (not OAuth 2.0 user flow). This approach is correct for server-side calendar access without user interaction.

**Service Account Details:**
- Project ID: `familycalendar-489421`
- Service Account Email: `pi-537@familycalendar-489421.iam.gserviceaccount.com`
- Authentication: JWT signed with private key → 1-hour access token
- Credentials: Base64-encoded JSON key in `server/data/config.internal.json`
- Scope: `https://www.googleapis.com/auth/calendar.readonly`

**Critical Setup Requirement:**

Each calendar owner must share their Google Calendar with the service account:

1. Open https://calendar.google.com
2. Find calendar in left sidebar → Settings and sharing
3. Share with specific people → Add: `pi-537@familycalendar-489421.iam.gserviceaccount.com`
4. Permission: **See all event details**
5. Click Send

Without sharing, the API returns 401 Unauthorized and backend logs show:
```
Calendar API error: "Request had invalid authentication credentials..."
```

**Verify Setup:**
```bash
# Check calendar API works
curl -s http://pi.local/api/calendar/events | jq '.events | length'

# Check logs for auth errors
ssh pi@pi.local "journalctl --since '5 minutes ago' | grep 'Calendar API error'"
```

**Complete Documentation:**
- Full setup guide: [`docs/architecture/calendar-service-account-setup.md`](./docs/architecture/calendar-service-account-setup.md)
- Troubleshooting, security, and migration from OAuth (if applicable)

## Tibber Live Consumption

The app supports real-time power consumption from Tibber Pulse via WebSocket subscription.

**Components:**
- `src/services/tibber.ts` - `TibberLiveConnection` class for WebSocket subscription
- `src/hooks/useLiveMeasurement.ts` - React hook for live data
- Electricity widget shows current power (kW) and daily consumption (kWh)

**Grid Fee:**
Tibber API `total` only includes spot price + tax. Grid fee (nettleie) is configured separately:
- Default: 0.36 kr/kWh (Tensio/Trondheim)
- Stored in `config.electricity.gridFee`

## Automatic Deployment

The app automatically deploys when code is pushed to main branch. Pi polls GitHub for new releases every 5 minutes.

### Architecture
```
Push to main → GitHub Actions builds → Creates release → Pi polls → Downloads & deploys
```

### Clean Start on Deployment

Deployments automatically ensure a clean browser state to prevent stale data issues:

**Server-side** (`scripts/auto-update.sh`):
1. Restart backend systemd service
2. Wait for health check (max 30s): `curl http://localhost:3001/api/health`
3. Send Ctrl+F5 to browser (hard refresh) AFTER backend ready

**Client-side** (`src/main.tsx`, `src/utils/versionBootstrap.ts`):
1. On page load, fetch `/api/version`
2. Compare with `localStorage.getItem('__kiosk_app_version__')`
3. If version changed → clear ALL localStorage
4. Mount React with clean state, fetch fresh config from server

**Result:** No race conditions, no stale cache, guaranteed clean start after deployment.

### Files
- `.github/workflows/release.yml` - Builds and creates GitHub release
- `scripts/auto-update.sh` - Pi polling script (update/rollback/status)
- `scripts/kiosk-updater.service` - Systemd oneshot service
- `scripts/kiosk-updater.timer` - Triggers every 5 minutes
- `scripts/setup-auto-deploy.sh` - One-time Pi setup
- `src/utils/versionBootstrap.ts` - Client-side version check and cache clearing

### Pi Commands
```bash
# Check update status
/var/www/kiosk/scripts/auto-update.sh status

# Manual update
/var/www/kiosk/scripts/auto-update.sh update

# Rollback to previous version
/var/www/kiosk/scripts/auto-update.sh rollback

# View update logs
journalctl -u kiosk-updater -f
```

### Pi Directory Structure
```
/var/www/kiosk                 → symlink to current version
/var/www/kiosk-releases/
├── v2024.02.17.1/            # Previous version
├── v2024.02.17.2/            # Current version (3 versions kept)
└── staging/                   # Temporary during deploy
```

### Setup on New Pi
```bash
# After initial manual deploy, run:
sudo bash /var/www/kiosk/scripts/setup-auto-deploy.sh
```

## TV Power Control (HDMI CEC)

Automated TV power management using HDMI CEC protocol to save electricity and extend screen life.

### Schedule
- **TV OFF:** 23:30 daily (night)
- **TV ON:** 06:00 daily (morning)

### Components
- `scripts/tv-control.sh` - CEC control script (on/off/status commands)
- `scripts/systemd/tv-off.service` - Systemd service to turn TV off
- `scripts/systemd/tv-on.service` - Systemd service to turn TV on
- `scripts/systemd/tv-off.timer` - Triggers at 23:30 daily
- `scripts/systemd/tv-on.timer` - Triggers at 06:00 daily

### Manual Control
```bash
# Turn TV on/off manually
/var/www/kiosk/scripts/tv-control.sh on
/var/www/kiosk/scripts/tv-control.sh off
/var/www/kiosk/scripts/tv-control.sh status

# Check timer status
systemctl list-timers tv-*

# View logs
sudo tail -f /var/log/tv-control.log
sudo journalctl -u tv-off.service
sudo journalctl -u tv-on.service
```

### Notes
- Uses `cec-utils` package (cec-client command)
- CEC must be enabled in TV settings (Philips: EasyLink, Samsung: Anynet+, Sony: Bravia Sync, etc.)
- Timers use `Persistent=true` to run missed executions on next boot
- Kiosk service continues running when TV is off (Chromium stays active)

## Mouse Cursor Hiding (Unclutter Service)

The mouse cursor is automatically hidden using a systemd user service for unclutter.

### Components
- `scripts/systemd/unclutter.service` - Systemd service to hide cursor
- `scripts/setup-unclutter.sh` - Installation script
- Integrated into `scripts/auto-update.sh` - Ensures service runs after deployments

### Setup
```bash
# One-time setup on Pi
sudo bash /var/www/kiosk/scripts/setup-unclutter.sh
```

### Manual Control
```bash
# Check status
systemctl --user status unclutter.service

# Stop (makes cursor visible for debugging)
systemctl --user stop unclutter.service

# Start (hides cursor)
systemctl --user start unclutter.service

# View logs
journalctl --user -u unclutter.service
```

### Helper Commands (from dev machine)
```bash
# Check cursor status
./scripts/kiosk-service.sh cursor-status

# Hide cursor
./scripts/kiosk-service.sh hide-cursor

# Show cursor (for debugging)
./scripts/kiosk-service.sh show-cursor

# Verify service (includes cursor check)
./scripts/kiosk-service.sh verify
```

### Notes
- Hides cursor after 0.1 seconds of inactivity
- Uses `-root` flag for root window cursor hiding
- Auto-starts with kiosk service via systemd dependency
- Auto-restarts if process crashes
- Managed independently from kiosk.service

### Troubleshooting
**CEC not working after setup:**
If CEC commands timeout or TV doesn't respond:
1. Verify EasyLink is enabled in TV settings
2. Unplug and replug HDMI cable (with both TV and Pi on)
3. Check CEC device appears: `echo 'scan' | cec-client -s -d 1 | grep "device #0"`
4. Check kernel messages: `dmesg | grep -i cec | tail -20`
5. Reboot Pi if needed: `sudo reboot`

## Admin View (Complete)

A secure admin interface for configuring the kiosk from a phone/laptop on the local network.

### Features
- ✅ Server-side config storage with AES-256-GCM encryption
- ✅ PIN-based authentication (4-8 digits)
- ✅ First-time setup: 6-char code displayed on TV, enter from phone
- ✅ PIN recovery via SSH command (`kiosk-admin reset-pin`)
- ✅ Mobile-first admin UI with setup wizard
- ✅ Settings management interface
- ✅ Factory reset functionality
- ✅ CLI tools for SSH recovery
- ✅ Real-time config updates via Server-Sent Events (SSE)

### Real-Time Config Updates

Settings saved in admin view push instant updates to dashboard via Server-Sent Events (SSE). Dashboard reflects changes within 1-2 seconds without manual refresh. Automatic fallback to 10-second polling if SSE connection fails.

Full documentation: [`docs/architecture/real-time-config-updates.md`](./docs/architecture/real-time-config-updates.md)

### Key Routes
- `/admin/setup` - First-time configuration wizard
- `/admin/login` - PIN authentication
- `/admin/settings` - Config management
- `/admin/reset` - Factory reset
- `/admin/recovery` - PIN recovery (SSH-initiated)

### CLI Tools

**Installation** (one-time setup on Pi):
```bash
sudo bash /var/www/kiosk/scripts/setup-admin.sh
```

**Usage**:
```bash
# SSH into Pi
ssh pi@pi.local

# Reset PIN (preserves settings)
sudo kiosk-admin reset-pin

# Factory reset (deletes all data)
sudo kiosk-admin factory-reset

# Check system status
kiosk-admin status
```

**Alternative** (if not installed):
```bash
# Use direct path to script
sudo bash /var/www/kiosk/scripts/kiosk-admin reset-pin
sudo bash /var/www/kiosk/scripts/kiosk-admin factory-reset
bash /var/www/kiosk/scripts/kiosk-admin status
```

Full plan: [`/docs/plans/admin-view.md`](./docs/plans/admin-view.md)

Implementation history: [`/docs/archive/implementation-history/`](./docs/archive/implementation-history/)

## Automatic Error Recovery

The kiosk includes a comprehensive 5-layer error recovery system that automatically heals from common failures without manual SSH intervention.

### Overview

**Problem**: Kiosk TV displays errors requiring manual SSH refresh (no keyboard/mouse access).

**Solution**: Defense-in-depth error recovery with automatic self-healing capabilities.

**Result**: 99%+ uptime with <1 manual intervention per week.

### Recent Improvements (2026-03-29)

**Tibber Connection Reliability Enhancements**:
- ✅ Phase 1.1: Explicit reconnection on TV wake (30-60s → <5s recovery)
- ✅ Phase 1.2: Increased state timeouts (25s/40s instead of 15s/30s)
- ✅ Phase 1.3: Enhanced connection failure logging for diagnostics

**Impact**: Significantly reduced "struggling with connection" issues after TV wake/sleep cycles.

### Error Recovery Layers

#### Layer 1: WebSocket Send Guard (Critical)

**Purpose**: Prevents WebSocket race conditions causing "Failed to execute 'send': Still in CONNECTING state" errors.

**Implementation** (`src/services/tibber.ts`):
- `safeSend()` method validates `readyState` before sending
- Logs warnings when WebSocket not ready
- Graceful degradation instead of throwing exceptions

**Monitoring**:
```javascript
// Browser console logs
[Tibber] Cannot send message, WebSocket not ready (state: 0)
```

#### Layer 2: React Error Boundary (High Priority)

**Purpose**: Catches React rendering errors that would cause blank screen.

**Implementation** (`src/components/ErrorBoundary.tsx`):
- Wraps entire React app in error boundary
- Displays large countdown overlay (10 seconds)
- Automatically reloads page after countdown
- TV-optimized text size for viewing distance

**Behavior**:
- Error occurs → Red screen with countdown
- 10 seconds → Automatic page reload
- Development mode shows technical details

**Monitoring**:
```javascript
// Browser console logs
[ErrorBoundary] Caught error: <error details>
[ErrorBoundary] Auto-reloading page...
```

#### Layer 3: Global Error Handlers (High Priority)

**Purpose**: Catches errors outside React (unhandled exceptions, promise rejections).

**Implementation** (`src/utils/errorRecovery.ts`):
- `window.onerror` - Script errors
- `window.onunhandledrejection` - Promise rejections
- Tracks error frequency (5 errors/60s window)
- Auto-reloads if error rate exceeds threshold

**Behavior**:
- Single error → Logged, app continues
- 5+ errors in 60s → Automatic reload (prevents error loops)
- Error window resets after 60 seconds

**Monitoring**:
```javascript
// Browser console logs
[ErrorRecovery] script error: <message>
[ErrorRecovery] promise error: <message>
[ErrorRecovery] 5 errors in 60s, reloading...
```

#### Layer 4: Page Visibility Recovery (High Priority)

**Purpose**: Recovers from TV sleep/wake cycles and browser focus loss.

**Implementation** (`src/hooks/usePageVisibility.ts`, `src/hooks/useServiceRecovery.ts`):
- Detects page visibility changes (TV on/off)
- Checks connectivity when page becomes visible
- **NEW (Phase 1.1):** Explicit Tibber reconnection on TV wake (reduces recovery from 30-60s → <5s)
- Hard refresh if hidden >5 minutes

**Tibber Connection Improvements**:
- **Phase 1.1:** Added explicit `forceReconnect()` call on page visibility
- **Phase 1.2:** Increased state timeouts (15s → 25s, 30s → 40s) for reliability
- **Phase 1.3:** Enhanced connection failure logging for diagnostics

**Behavior**:
- Page hidden (TV off) → Log event
- Page visible (TV on) → Check connectivity, **trigger Tibber force reconnect**, reconnect services
- Hidden >5 minutes → Hard refresh for clean state

**Monitoring**:
```javascript
// Browser console logs
[PageVisibility] Page hidden
[PageVisibility] Page visible (was hidden for 30s)
[ServiceRecovery] Checking services after visibility change...
[ServiceRecovery] Triggering Tibber reconnection after wake  // NEW
[Tibber] Force reconnecting due to stale data
[Tibber] State: data_flowing → stale (data stale, forcing reconnect)
[ServiceRecovery] Online - services will auto-reconnect
[PageVisibility] Was hidden for >5 min, reloading page for fresh start

// Connection failure logs (Phase 1.3)
[Tibber] Connection failed: timeout in connecting, attempt #2, next delay: 2000ms
```

#### Layer 5: Watchdog Timer (Low Priority - Safety Net)

**Purpose**: Detects complete UI freeze scenarios.

**Implementation** (`src/hooks/useVersionCheck.ts`):
- Heartbeat updated every 30 seconds (version check polling)
- Watchdog checks every 60 seconds
- Reloads if no heartbeat for 5 minutes
- Indicates frozen JavaScript event loop

**Behavior**:
- Normal operation → Silent (heartbeat active)
- UI freeze >5 minutes → Automatic reload

**Monitoring**:
```javascript
// Browser console logs (only on freeze detection)
[Watchdog] No heartbeat for 5 minutes, app may be frozen. Reloading...
```

### Error Recovery Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        ERROR OCCURS                          │
└─────────────────────────────────────────────────────────────┘
                              ↓
              ┌───────────────┴───────────────┐
              ↓                               ↓
    React Render Error              Non-React Error
              ↓                               ↓
    [ErrorBoundary]                [Global Handlers]
    Show countdown (10s)           Log error, check frequency
    Auto-reload                    5 errors/60s → reload
              ↓                               ↓
    ┌─────────────────────────────────────────┐
    │         Page Reload / Recovery           │
    └─────────────────────────────────────────┘
                              ↓
              [Version Bootstrap - Clean Start]
              Clear cache, fetch config, mount
                              ↓
              ┌───────────────┴───────────────┐
              ↓                               ↓
    [Page Visibility]              [Watchdog Timer]
    Wake from sleep?               UI frozen >5min?
    → Check connectivity           → Force reload
    → Reconnect services
```

### Testing Error Recovery

#### Test Layer 1 (WebSocket Guard)
```javascript
// Monitor browser console during Tibber connection
// Should NOT see: "Failed to execute 'send' on 'WebSocket': Still in CONNECTING state"
// SHOULD see (if timing issue): "[Tibber] Cannot send message, WebSocket not ready"
```

#### Test Layer 2 (Error Boundary)
```typescript
// Temporarily add to Header.tsx for testing
throw new Error('Test error boundary');

// Expected: Red countdown screen → reload after 10s
// Remove test error after verification
```

#### Test Layer 3 (Global Handlers)
```javascript
// Browser console
Promise.reject('Test unhandled rejection');

// Expected: [ErrorRecovery] promise error: Test unhandled rejection
// Page continues running (no crash)

// Test error threshold
for(let i=0; i<5; i++) Promise.reject('Test ' + i);
// Expected: [ErrorRecovery] 5 errors in 60s, reloading...
```

#### Test Layer 4 (Page Visibility)
```bash
# Lock screen for 10 seconds, unlock
# Expected console logs:
# [PageVisibility] Page hidden
# [PageVisibility] Page visible (was hidden for 10s)
# [ServiceRecovery] Checking services...

# Lock screen for >5 minutes, unlock
# Expected: Hard page reload
```

#### Test Layer 5 (Watchdog)
```javascript
// Difficult to test (requires UI freeze)
// Simulate by running infinite loop in console:
while(true) {}

// Expected after 5 minutes: Auto-reload
// WARNING: This will freeze browser tab!
```

### Monitoring in Production

**Check Error Recovery Activity**:
```bash
# SSH into Pi
ssh pi@pi.local

# View browser console (if using SSH X11 forwarding)
DISPLAY=:0 google-chrome --remote-debugging-port=9222

# Check for recent errors in systemd logs
journalctl --since "1 hour ago" | grep -i error

# Monitor kiosk service logs
journalctl -u kiosk.service -f
```

**Console Log Prefixes**:
- `[ErrorBoundary]` - React error caught, countdown displayed
- `[ErrorRecovery]` - Global error handler activity
- `[PageVisibility]` - Screen wake/sleep events
- `[ServiceRecovery]` - Service health checks
- `[Watchdog]` - UI freeze detection
- `[Tibber]` - WebSocket activity and safeSend warnings

### Performance Impact

**Bundle Size**: +4 KB gzipped (negligible)
**CPU Usage**: <0.5% (periodic checks only)
**Memory**: <1 MB (error log arrays, timers)
**Recovery Time**: 1-10 seconds (depending on error type)

**Acceptable for Raspberry Pi 2 Model B** (1GB RAM, quad-core ARMv7)

### Recovery Success Metrics

**Before Error Recovery**:
- Manual SSH refreshes: 3-5 per week
- WebSocket errors: Daily
- Blank screens: Weekly
- TV wake failures: Occasional

**After Error Recovery**:
- Manual SSH refreshes: <1 per week
- WebSocket errors: Auto-recovered
- Blank screens: Auto-recovered (10s countdown)
- TV wake failures: Auto-recovered (hard refresh)
- Uptime: 99%+ (self-healing within 60s)

### Rollback Plan

Each layer is independent and can be disabled if issues arise:

**Disable Error Boundary**:
```typescript
// src/main.tsx - Remove ErrorBoundary wrapper
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppContextProvider>  {/* Direct child, skip ErrorBoundary */}
      ...
    </AppContextProvider>
  </React.StrictMode>
);
```

**Disable Global Handlers**:
```typescript
// src/main.tsx - Comment out setup call
// setupGlobalErrorHandlers();
```

**Disable Page Visibility**:
```typescript
// src/App.tsx - Comment out hooks
// usePageVisibility({ ... });
```

**Disable Watchdog**:
```typescript
// src/hooks/useVersionCheck.ts - Comment out watchdog setup
// const watchdog = setupWatchdog();
```

**Disable WebSocket Guard**:
```typescript
// src/services/tibber.ts - Revert to direct ws.send()
this.ws?.send(JSON.stringify(message));  // Instead of safeSend()
```

### Future Enhancements

**Potential Additions** (not implemented):
- Network connectivity monitoring with visual indicator
- Backend health check with auto-restart
- Error rate metrics sent to remote monitoring
- Configurable error thresholds via admin UI
- Error history log with timestamps

## Troubleshooting

### Photo Widget Issues

**Symptom:** Photo widget shows error message (e.g., "Invalid response type: text/html (expected JSON)" or older "Unexpected token '<'")

**Root Cause:** Backend unavailable or returning HTML error pages (502/504 from Nginx). The frontend now detects this before attempting JSON parsing and shows a clear error message.

**Immediate Fix:**
```bash
# Hard refresh browser to clear cached error
ssh pi@pi.local 'DISPLAY=:0 xdotool key --clearmodifiers ctrl+F5'

# Wait 5 seconds and verify photos display
sleep 5
ssh pi@pi.local 'DISPLAY=:0 scrot /tmp/screen.png' && scp pi@pi.local:/tmp/screen.png /tmp/kiosk-screenshot.png
```

**Check Backend Health:**
```bash
# From development machine
./scripts/kiosk-service.sh backend-health

# Or directly on Pi
ssh pi@pi.local
systemctl status kiosk-photos.service
curl http://localhost:3001/api/health
curl http://localhost:3001/api/photos | jq '.photos | length'
```

**Backend Management:**
```bash
# View backend logs
./scripts/kiosk-service.sh backend-logs
# Or: ssh pi@pi.local 'journalctl -u kiosk-photos.service -n 50'

# Restart backend
./scripts/kiosk-service.sh backend-restart
# Or: ssh pi@pi.local 'sudo systemctl restart kiosk-photos.service'

# Check backend status
./scripts/kiosk-service.sh backend-status
```

**Why This Happens:**
1. During deployment or backend restart, there's a brief window where backend is unavailable
2. If frontend requests photos during this window, Nginx returns HTML error page (502/504)
3. Frontend detects invalid Content-Type and shows clear error message
4. Automatic recovery attempts every 60 seconds

**Protection Layers:**
The deployment script (`scripts/auto-update.sh`):
- Restarts backend systemd service
- Waits for health check (max 30s)
- Only sends browser refresh AFTER backend is confirmed healthy

Frontend includes defense-in-depth validation (`src/services/photos.ts`):
- **Layer 1**: Content-Type validation (rejects HTML responses before parsing)
- **Layer 2**: JSON parse error handling (detailed error messages with response preview)
- **Layer 3**: Response structure validation (ensures valid photo data)
- Retry logic with exponential backoff (3 attempts: 2s, 4s, 8s delays)
- Automatic error recovery (retries every 60s when in error state)

**Error Messages:**
- `Invalid response type: text/html (expected JSON)` - Backend returned HTML (502/504 error page)
- `JSON parse error: ...` - Response was JSON but malformed (should be rare)
- `API error: 500/502/504` - Backend unavailable or crashed

### Backend Service Issues

**Service not running:**
```bash
# Check service status
systemctl status kiosk-photos.service

# Start service
sudo systemctl start kiosk-photos.service

# Check logs for errors
journalctl -u kiosk-photos.service -n 50
```

**Port 3001 not listening:**
```bash
# Check what's using the port
ss -tlnp | grep 3001

# If nothing, check backend logs
journalctl -u kiosk-photos.service -f
```

**Photos endpoint returns empty array:**
- Check iCloud album URL is configured in `/var/www/kiosk/.env`
- Verify `ICLOUD_ALBUM_URL` environment variable is set
- Check backend logs for iCloud API errors
