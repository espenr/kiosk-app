# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Commands

### Development
- `./scripts/start-dev.sh` - Start both frontend and backend servers (recommended)
  - Frontend: Vite dev server on port 3000
  - Backend: Node.js server on port 3001
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
- Backend: `/var/www/kiosk/server/dist/` (Node.js on port 3001)
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
- Backend: `/var/www/kiosk/server/` (Node.js on port 3001)
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
