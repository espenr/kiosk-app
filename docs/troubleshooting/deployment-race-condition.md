# Deployment Race Condition Fix

**Issue Date:** 2026-03-08
**Status:** Fixed in commit 42052685
**Severity:** Medium (caused photo slideshow to show error state after auto-deployment)

## Problem Description

After automatic deployments, the photo slideshow would get stuck showing "Ingen bilder konfigurert" (No pictures configured) even though the backend was working correctly. Manual browser refresh (F5) would fix it.

## Root Cause

The auto-update script had a race condition in `restart_services()`:

1. **Duplicate process management:**
   - Script started backend manually with `nohup node dist/index.js`
   - Then immediately restarted `kiosk-photos` systemd service
   - Both tried to manage the same process on port 3001
   - Created conflicts and restart delays

2. **Browser refreshed too early:**
   - Browser was hard-refreshed immediately after starting backend
   - Backend took ~10-14 seconds to fully initialize
   - Frontend loaded while backend was still starting
   - `/api/photos` request failed → error state persisted for 10 minutes

### Timeline Example (v2026.03.08.127 deployment)

```
15:09:48 - Old backend killed
15:09:50 - Manual backend started (nohup)
15:09:52 - *** BROWSER REFRESHED (too early!) ***
15:09:58 - Systemd killed manual backend, started own process
15:10:02 - Backend fully online (10s AFTER browser loaded)
```

**Result:** Frontend fetch failed, showed error UI, didn't retry for 10 minutes.

## Solution

**Simplified service management:**
- Removed manual `nohup` backend start
- Use ONLY systemd `kiosk-photos` service
- Added health check polling (max 30s timeout)
- Browser refresh happens AFTER backend is confirmed healthy

### Code Changes (`scripts/auto-update.sh`)

**Before:**
```bash
restart_services() {
    # Start backend manually
    nohup node dist/index.js &
    sleep 2

    # Also restart systemd service (conflict!)
    sudo systemctl restart kiosk-photos

    # Refresh browser immediately (too early!)
    xdotool key ctrl+F5
}
```

**After:**
```bash
restart_services() {
    # Use ONLY systemd service
    sudo systemctl restart kiosk-photos

    # Wait for backend to be ready (max 30s)
    while [ $wait_count -lt 30 ]; do
        if curl -sf http://localhost:3001/api/health; then
            break
        fi
        sleep 1
    done

    # THEN refresh browser
    xdotool key ctrl+F5
}
```

## Testing

To verify the fix works:

1. **Deploy the fix:**
   ```bash
   npm run deploy
   ```

2. **Monitor next auto-deployment:**
   ```bash
   ssh pi@pi.local
   sudo journalctl -u kiosk-updater -f
   ```

3. **Expected log output:**
   ```
   Restarting kiosk-photos service...
   Waiting for backend to initialize...
   Backend ready after 3s
   Sent hard refresh to browser
   ```

4. **Verify photo slideshow loads immediately** after auto-update (no error state)

## Impact

- **Eliminates race condition** between browser refresh and backend startup
- **Reduces deployment window** from ~14s to ~3-5s (no process conflicts)
- **Auto-recovers from slow starts** (polls for up to 30s)
- **Prevents error state persistence** (browser only loads when backend ready)

## Future Improvements (Optional)

If issues persist, consider:

1. **Frontend retry logic** - Add exponential backoff for failed initial fetches
2. **Connection recovery UI** - Show "Reconnecting..." instead of error for first 30s
3. **WebSocket health monitoring** - Push backend status changes to frontend
4. **Graceful deployment** - Blue-green deployment with zero downtime

## Related Files

- `scripts/auto-update.sh` - Deployment script (fixed)
- `src/hooks/usePhotos.ts` - Frontend photo state management
- `src/services/photos.ts` - API fetch with fallback logic
- `server/dist/index.js` - Backend managed by systemd

## Verification Checklist

- [x] Removed duplicate process management
- [x] Added backend health check before browser refresh
- [x] Set 30s timeout for backend initialization
- [x] Tested deployment script syntax
- [x] Documented issue and solution
- [ ] Verified fix in production after next auto-deployment
