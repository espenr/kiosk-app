# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Commands

### Development
- `npm run dev` - Start development server with hot-reload (port 3000)
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
| Photos | `photos.ts` | `usePhotos.ts` | Static JSON (from iCloud sync) |

### State Management
- **ConfigContext** (`src/contexts/ConfigContext.tsx`): API keys, location, settings
- LocalStorage persistence via `src/utils/storage.ts`
- No widget system - sections are fixed components

### Build Configuration
- Preact alias in `vite.config.ts`: `'react' -> 'preact/compat'`, `'react-dom' -> 'preact/compat'`
- Tailwind CSS via PostCSS (`postcss.config.js`, `tailwind.config.js`)
- Path alias: `'@' -> 'src'`

## iCloud Photo Sync

The photo slideshow fetches images from an iCloud Shared Album via Apple's undocumented SharedStreams API.

### How It Works
1. `scripts/sync-photos.sh` calls iCloud API to get photo metadata and download URLs
2. URLs are saved to `photos.json` (served as static file)
3. Frontend loads `photos.json` and displays photos with crossfade/Ken Burns effects

### Important: URLs Expire After ~2 Hours
iCloud photo URLs contain an expiry timestamp (`e=` parameter). After expiration, requests return 401 Unauthorized.

**On the Pi:** Handled automatically
- Cron job runs `sync-photos.sh` hourly to refresh URLs before they expire
- Deploy script excludes `photos.json` to avoid overwriting fresh URLs with stale local copy

**On localhost:** Manual refresh needed when URLs expire
```bash
# Option 1: With URL inline
ICLOUD_ALBUM_URL="https://www.icloud.com/sharedalbum/#B0WG6XBub2e3y" ./scripts/sync-photos.sh

# Option 2: Add to .env file (one-time setup)
echo 'ICLOUD_ALBUM_URL=https://www.icloud.com/sharedalbum/#B0WG6XBub2e3y' > .env
./scripts/sync-photos.sh
```

### Setup on Pi
```bash
# Configure album URL
echo 'ICLOUD_ALBUM_URL=https://www.icloud.com/sharedalbum/#TOKEN' > /var/www/kiosk/.env

# Initial sync
/var/www/kiosk/scripts/sync-photos.sh

# Cron job (added by deploy script, or manually)
0 * * * * /var/www/kiosk/scripts/sync-photos.sh >> /var/log/kiosk-photos.log 2>&1
```

## Code Style
- TypeScript for all new code, avoid `any` type
- camelCase for variables/functions, PascalCase for components/types
- Functional components with hooks (not class components)
- Tailwind CSS classes for all styling, no inline styles except for dynamic values
- Group imports: external -> internal -> styles
- Use Prettier for formatting (default config)

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
- Phase 7: Settings & Polish - **IN PROGRESS**

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

## Next Task: Raspberry Pi Kiosk Mode Setup

Configure the Pi to boot directly into fullscreen Chromium displaying the kiosk app.

### Requirements
1. Auto-login on boot (no password prompt)
2. Auto-start Chromium in fullscreen kiosk mode
3. Navigate to `http://localhost` on startup
4. Disable screen blanking/screensaver
5. Hide mouse cursor after inactivity

### Scripts to Create

**`scripts/setup-kiosk.sh`** - Run ON the Pi to configure:
```bash
#!/bin/bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y chromium-browser unclutter xdotool

# Enable auto-login to desktop
sudo raspi-config nonint do_boot_behaviour B4

# Create autostart directory
mkdir -p ~/.config/lxsession/LXDE-pi

# Create autostart file
cat > ~/.config/lxsession/LXDE-pi/autostart << 'EOF'
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xset s off
@xset -dpms
@xset s noblank
@unclutter -idle 0.5 -root
@/var/www/kiosk/scripts/kiosk.sh
EOF

# Disable screen blanking in lightdm
sudo sed -i 's/#xserver-command=X/xserver-command=X -s 0 -dpms/' /etc/lightdm/lightdm.conf

echo "Kiosk mode configured. Reboot to apply."
```

**`scripts/kiosk.sh`** - Kiosk launcher (deploy to Pi):
```bash
#!/bin/bash
# Wait for X to be ready
sleep 10

# Clear any previous Chromium crashes
rm -rf ~/.config/chromium/Singleton*

# Start Chromium in kiosk mode
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-translate \
  --disable-features=TranslateUI \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --no-first-run \
  --start-fullscreen \
  http://localhost
```

### Setup Steps
1. SSH into Pi: `ssh pi@raspberrypizerow2.local`
2. Run: `bash /var/www/kiosk/scripts/setup-kiosk.sh`
3. Configure localStorage (Tibber API key) before enabling kiosk mode
4. Reboot: `sudo reboot`

### LocalStorage Configuration on Pi
Before enabling kiosk mode, set the Tibber API key in the browser:
```javascript
const stored = JSON.parse(localStorage.getItem('kiosk-app:config') || '{}');
stored.apiKeys = { tibber: 'YOUR_TIBBER_TOKEN' };
stored.electricity = { gridFee: 0.36 };
localStorage.setItem('kiosk-app:config', JSON.stringify(stored));
location.reload();
```

### Portrait Mode (if needed)
Add to `/boot/config.txt`:
```
display_rotate=1  # 90 degrees clockwise
```

### Rollback
```bash
sudo raspi-config nonint do_boot_behaviour B1
rm ~/.config/lxsession/LXDE-pi/autostart
```
