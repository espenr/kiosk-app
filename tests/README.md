# Kiosk App Testing

This directory contains test-related files for the Kiosk App project.

## Directory Structure

```
tests/
├── README.md          # This file
└── screenshots/       # Generated screenshots (if needed)
```

## Current Testing Approach

The kiosk app uses a **fixed-layout architecture** with specific sections (Header, Photo+Calendar, Electricity, Transport). Testing focuses on integration and deployment verification rather than component-level unit tests.

### Manual Testing

**Local Development:**
```bash
npm run dev
# Visit http://localhost:3000/
# Verify all sections load and display data correctly
```

**Pre-Commit Verification:**
```bash
npm run typecheck && npm run lint
# Both must pass before committing
```

**Deployment Testing:**
```bash
npm run deploy
# Verify deployment to Pi completes successfully
# Check dashboard loads at http://raspberrypizerow2.local/
```

### Integration Testing on Pi

After deployment, verify each section:

1. **Header Section**
   - Clock displays current time
   - Date displays correctly
   - Weather shows temperature and icon

2. **Photo Slideshow**
   - Photos load from iCloud Shared Album
   - Transitions work smoothly
   - Fallback to `/photos.json` if API unavailable

3. **Calendar Section**
   - Events display with correct times
   - Google Calendar integration works
   - Handles missing OAuth gracefully

4. **Electricity Section**
   - Current price displays
   - Hourly chart renders
   - Live consumption updates (if Pulse configured)

5. **Transport Section**
   - Bus departures show
   - Real-time updates work
   - Entur API integration works

### Admin Interface Testing

**Setup Flow:**
```bash
# First time setup
curl http://raspberrypizerow2.local/admin
# Should show setup code on TV
# Complete wizard on phone/laptop
```

**Settings Management:**
```bash
# Login with PIN
# Verify all configuration sections load
# Test save/update functionality
```

**Recovery:**
```bash
# SSH into Pi
ssh pi@raspberrypizerow2.local
sudo kiosk-admin reset-pin
# Verify new setup code displayed
```

## Test Data

### Fallback Photo Data

**File:** `/public/photos.json`
- Contains 97 iCloud photo URLs
- Used as fallback when `/api/photos` unavailable
- Updated by photo proxy server automatically

## Automated Testing

Currently, the app does not use automated unit/integration tests. The focus is on:

1. **TypeScript type checking** - Catches type errors at compile time
2. **ESLint** - Enforces code quality and consistency
3. **Manual testing** - Verifies functionality on target device (Pi Zero W 2)

### Why No Automated Browser Tests?

The previous widget-based architecture used Puppeteer for automated testing. The current fixed-layout architecture is simpler and more stable:

- **Fixed layout** - No dynamic widget positioning to test
- **Target device specific** - 768x1366 portrait display on Pi Zero W 2
- **API-driven** - Data from external APIs (harder to mock reliably)
- **Visual verification needed** - Many issues are visual (layout, styling)

Manual testing on the actual Pi device provides better coverage than automated browser tests.

## Adding New Tests

If you need to add automated tests in the future:

1. **Consider Vitest** for unit tests (faster than Puppeteer)
2. **Use Playwright** for e2e tests (more reliable than Puppeteer)
3. **Test on actual Pi** - Performance characteristics differ significantly

## Troubleshooting

### Port 3000 Already in Use

```bash
# Find and kill process using port 3000
lsof -ti:3000 | xargs kill -9
npm run dev
```

### Pi Not Reachable

```bash
# Try static IP instead of mDNS
ping 192.168.50.37
```

### Photo Slideshow Not Working

```bash
# Check photo proxy service on Pi
ssh pi@raspberrypizerow2.local "systemctl status kiosk-photos"

# Check fallback file exists
curl http://raspberrypizerow2.local/photos.json | jq '.photos | length'
```

### Admin View Not Loading

```bash
# Check backend service
ssh pi@raspberrypizerow2.local "systemctl status kiosk-photos"

# Check Nginx config
ssh pi@raspberrypizerow2.local "sudo nginx -t"
```

## Test Coverage

Current manual test coverage:

- ✅ All data sections display correctly
- ✅ API integrations work (Met.no, Entur, Tibber, Google Calendar)
- ✅ Photo slideshow with backend proxy
- ✅ Admin interface (setup, login, settings)
- ✅ Deployment pipeline (manual and auto-deploy)
- ✅ TypeScript type safety
- ✅ ESLint code quality

## Documentation

For more testing information, see:
- [Deployment Guide](../docs/DEPLOYMENT_GUIDE.md)
- [Architecture Documentation](../docs/architecture/)
- [Admin View Plan](../docs/plans/admin-view.md)
