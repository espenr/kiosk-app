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
- **Target Device:** Raspberry Pi Zero W 2 (512MB RAM)
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
The application uses a fixed vertical layout optimized for a 32" portrait TV (768x1366px).

**Layout Sections** (`src/components/layout/DashboardLayout.tsx`):
- **Header** (10%): Clock, date, weather - `src/components/sections/Header/`
- **Photo + Calendar** (72%): Side-by-side split - `src/components/sections/PhotoSlideshow/`, `src/components/sections/Calendar/`
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
- **Target:** 32" TV in portrait orientation (768x1366px)
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

### Files
- `.github/workflows/release.yml` - Builds and creates GitHub release
- `scripts/auto-update.sh` - Pi polling script (update/rollback/status)
- `scripts/kiosk-updater.service` - Systemd oneshot service
- `scripts/kiosk-updater.timer` - Triggers every 5 minutes
- `scripts/setup-auto-deploy.sh` - One-time Pi setup

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
ssh pi@raspberrypizerow2.local

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
