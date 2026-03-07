# Auto-Update Verification Test Plan

## Overview

This document outlines the testing procedure for the bulletproof auto-update implementation (commit c4ba52d2).

## What Was Fixed

**Problem**: GitHub releases missing `server/package-lock.json` caused non-deterministic npm installs. The `jsonwebtoken` package (critical for Google Calendar API) failed to install correctly, causing backend crashes and broken Calendar widgets.

**Solution**: 5-layer defense-in-depth approach:
1. Include package-lock.json in release tarballs
2. Expose npm install errors with verbose logging
3. Verify backend process startup
4. Comprehensive health checks
5. Automatic rollback on failure

## Pre-Flight Checklist

Before testing, ensure:
- [ ] You have SSH access to Pi: `ssh pi@pi.local`
- [ ] Current version is stable and widgets work
- [ ] You can manually trigger rollback if needed

## Test 1: Verify Package Lock in New Release

**Purpose**: Confirm package-lock.json is included in release tarball

```bash
# After pushing to main, wait for GitHub Actions to complete
# Download latest release
curl -L https://github.com/espenr/kiosk-app/releases/latest/download/kiosk-app.tar.gz -o /tmp/test.tar.gz

# Check contents
tar -tzf /tmp/test.tar.gz | grep package-lock.json
```

**Expected**: Output shows `server/package-lock.json`

**Status**: ⏳ Pending

---

## Test 2: Normal Update Flow

**Purpose**: Verify successful deployment with all health checks

```bash
# SSH into Pi
ssh pi@pi.local

# Check current version
/var/www/kiosk/scripts/auto-update.sh status

# Trigger update
/var/www/kiosk/scripts/auto-update.sh update

# Monitor logs in real-time
tail -f /var/log/kiosk-updater.log
```

**Expected Output Pattern**:
```
[timestamp] Current version: v2026.03.XX.YY
[timestamp] Latest version: v2026.03.XX.ZZ
[timestamp] Installing server dependencies...
[timestamp] Server dependencies installed successfully
[timestamp] Updated to version v2026.03.XX.ZZ
[timestamp] Starting backend server...
[timestamp] Backend server started with PID: XXXXX
[timestamp] Backend server process verified running
[timestamp] Running post-deployment health checks...
[timestamp] Checking backend health endpoint...
[timestamp] Backend health check: OK
[timestamp] Verifying backend version...
[timestamp] Backend version check: OK (vX.X.X.X)
[timestamp] Checking calendar API endpoint...
[timestamp] Calendar API check: OK (HTTP 200|401|500)
[timestamp] Checking frontend accessibility...
[timestamp] Frontend check: OK
[timestamp] All health checks passed!
[timestamp] Deployment complete and verified!
```

**Verify**:
```bash
# Check backend health
curl http://localhost:3001/api/health
# Expected: {"status":"ok"}

# Check calendar API (may be 401 if not configured)
curl -i http://localhost:3001/api/calendar/events
# Expected: HTTP 200, 401, or 500 (not 000 or timeout)

# Check frontend
curl -I http://localhost/
# Expected: HTTP 200

# Verify jsonwebtoken was installed
ls /var/www/kiosk/server/node_modules/jsonwebtoken
# Expected: Directory exists
```

**Check Widgets**:
- Open browser: `http://pi.local`
- Verify Calendar widget shows events (if configured)
- Verify all widgets render correctly

**Status**: ⏳ Pending

---

## Test 3: Simulated Backend Crash

**Purpose**: Verify deployment fails when backend won't start

```bash
# SSH into Pi
ssh pi@pi.local

# Backup current backend
sudo cp /var/www/kiosk/server/dist/index.js /tmp/index.js.backup

# Corrupt backend file
echo "syntax error" | sudo tee /var/www/kiosk/server/dist/index.js

# Try to restart backend
sudo /var/www/kiosk/scripts/auto-update.sh update 2>&1 | tee /tmp/test3.log
```

**Expected**:
- Error message: "Backend server failed to start (process died immediately)"
- Script exits with error code 1
- System remains in previous stable version

**Verify**:
```bash
# Check current version (should NOT have changed)
cat /var/www/kiosk/VERSION

# Restore backend
sudo cp /tmp/index.js.backup /var/www/kiosk/server/dist/index.js

# Restart backend
sudo systemctl restart kiosk-backend
```

**Status**: ⏳ Pending

---

## Test 4: Simulated Missing Dependency

**Purpose**: Verify npm install verification catches missing dependencies

```bash
# SSH into Pi
ssh pi@pi.local

# Manually remove critical dependency
sudo rm -rf /var/www/kiosk/server/node_modules/jsonwebtoken

# Trigger update (or just restart)
sudo /var/www/kiosk/scripts/auto-update.sh update 2>&1 | tee /tmp/test4.log
```

**Expected**:
- npm ci detects missing dependency
- Error: "Critical dependency 'jsonwebtoken' not found after installation"
- Script exits before attempting backend restart

**Status**: ⏳ Pending

---

## Test 5: Simulated Health Check Failure

**Purpose**: Verify deployment fails when health checks don't pass

```bash
# SSH into Pi
ssh pi@pi.local

# Block port 3001 temporarily (simulate backend not responding)
nc -l 3001 &
NC_PID=$!

# Try update (will fail health check)
sudo /var/www/kiosk/scripts/auto-update.sh update 2>&1 | tee /tmp/test5.log

# Kill netcat
kill $NC_PID
```

**Expected**:
- Backend starts but health check fails
- Error: "Backend health check failed after 5 attempts"
- Script exits with error

**Status**: ⏳ Pending

---

## Test 6: Manual Rollback

**Purpose**: Verify rollback procedure works with health checks

```bash
# SSH into Pi
ssh pi@pi.local

# Trigger rollback
sudo /var/www/kiosk/scripts/auto-update.sh rollback

# Monitor logs
tail -f /var/log/kiosk-updater.log
```

**Expected**:
```
[timestamp] Current version: vX.X.X.Y
[timestamp] Rolling back to: vX.X.X.Z
[timestamp] Rolled back to version vX.X.X.Z
[timestamp] Starting backend server...
[timestamp] Backend server process verified running
[timestamp] Verifying rollback health...
[timestamp] Checking backend health endpoint...
[timestamp] Backend health check: OK
[timestamp] All health checks passed!
[timestamp] Rollback completed successfully
```

**Verify**:
```bash
# Check version changed
cat /var/www/kiosk/VERSION

# Verify widgets work
curl http://localhost:3001/api/health
curl http://pi.local/
```

**Status**: ⏳ Pending

---

## Test 7: npm ci vs npm install Fallback

**Purpose**: Verify fallback to npm install works for old releases

```bash
# SSH into Pi
ssh pi@pi.local

# Simulate old release without lock file
cd /var/www/kiosk-releases
sudo mkdir -p test-old-release/server
sudo cp -r /var/www/kiosk/server/dist test-old-release/server/
sudo cp /var/www/kiosk/server/package.json test-old-release/server/
# Note: deliberately NOT copying package-lock.json

# Run npm install manually to test fallback
cd test-old-release/server
npm install --omit=dev

# Check for warning about missing lock file
# Check jsonwebtoken was installed
ls node_modules/jsonwebtoken
```

**Expected**:
- Warning: "No package-lock.json found, using npm install (less reliable)"
- npm install completes successfully
- jsonwebtoken directory exists

**Status**: ⏳ Pending

---

## Test 8: Automatic Systemd Timer Update

**Purpose**: Verify timer triggers update automatically

```bash
# SSH into Pi
ssh pi@pi.local

# Check timer status
systemctl list-timers kiosk-updater

# Wait for next trigger (every 5 minutes)
# Or manually trigger:
sudo systemctl start kiosk-updater.service

# Check logs
journalctl -u kiosk-updater -n 50
```

**Expected**:
- Timer shows "NEXT" column with upcoming trigger
- Service runs successfully
- Logs show health checks passed

**Status**: ⏳ Pending

---

## Test 9: Log File Verification

**Purpose**: Ensure all operations are logged correctly

```bash
# SSH into Pi
ssh pi@pi.local

# Check log file exists and is writable
ls -lh /var/log/kiosk-updater.log

# Review recent logs
tail -100 /var/log/kiosk-updater.log

# Check for error patterns
grep ERROR /var/log/kiosk-updater.log
```

**Expected**:
- Log file exists
- Timestamps on every line
- Clear step-by-step progress messages
- Errors (if any) are clearly marked in red

**Status**: ⏳ Pending

---

## Test 10: End-to-End Widget Verification

**Purpose**: Confirm all widgets work after successful deployment

```bash
# SSH into Pi
ssh pi@pi.local

# Check all API endpoints
echo "=== Health Check ==="
curl -s http://localhost:3001/api/health | jq

echo "=== Version Check ==="
curl -s http://localhost:3001/api/version | jq

echo "=== Calendar API ==="
curl -s http://localhost:3001/api/calendar/events | jq '.events | length'

echo "=== Electricity API ==="
curl -s http://localhost:3001/api/electricity/prices | jq '.prices | length'

echo "=== Photos API ==="
curl -s http://localhost:3001/api/photos | jq '.photos | length'
```

**Expected**:
- Health: `{"status":"ok"}`
- Version: `{"version":"vX.X.X.X"}`
- Calendar: Number of events (or 401 if not configured)
- Electricity: Number of price entries (or 401 if not configured)
- Photos: Number of photos (or empty array if not configured)

**Visual Check**:
- Open `http://pi.local` in browser
- All widgets display correctly
- Calendar shows events (if configured)
- No console errors (F12 DevTools)

**Status**: ⏳ Pending

---

## Success Criteria

All tests must pass with these results:

- ✅ package-lock.json appears in release tarball
- ✅ Normal update completes with all health checks passing
- ✅ Backend crash detection prevents bad deployment
- ✅ Missing dependency detection works
- ✅ Health check failures prevent deployment
- ✅ Manual rollback works with verification
- ✅ npm install fallback works for old releases
- ✅ Systemd timer triggers updates automatically
- ✅ All operations logged clearly
- ✅ All widgets work after deployment

## Rollback Procedure (If Tests Fail)

If testing reveals issues:

```bash
# Option 1: Manual rollback via script
ssh pi@pi.local "sudo /var/www/kiosk/scripts/auto-update.sh rollback"

# Option 2: Direct symlink manipulation
ssh pi@pi.local "cd /var/www/kiosk-releases && ls -lt"  # Find previous version
ssh pi@pi.local "sudo ln -sfn /var/www/kiosk-releases/v2026.03.XX.YY /var/www/kiosk"
ssh pi@pi.local "sudo systemctl restart kiosk-backend kiosk-photos"

# Option 3: Manual deployment from dev machine
npm run deploy
```

## Monitoring Commands

**Real-time update monitoring**:
```bash
ssh pi@pi.local "journalctl -u kiosk-updater -f"
```

**Backend logs**:
```bash
ssh pi@pi.local "tail -f /tmp/kiosk-backend.log"
```

**Health check loop**:
```bash
watch -n 5 'curl -sf http://pi.local/api/health | jq'
```

**Check for failed updates**:
```bash
ssh pi@pi.local "grep ERROR /var/log/kiosk-updater.log | tail -10"
```

## Notes

- Test on staging/dev Pi first if available
- Keep SSH session open during testing for emergency recovery
- Document any unexpected behavior in GitHub issues
- Update this document as tests are completed

## Test Results

| Test | Status | Date | Notes |
|------|--------|------|-------|
| 1. Package lock in release | ⏳ Pending | - | - |
| 2. Normal update flow | ⏳ Pending | - | - |
| 3. Backend crash detection | ⏳ Pending | - | - |
| 4. Missing dependency check | ⏳ Pending | - | - |
| 5. Health check failure | ⏳ Pending | - | - |
| 6. Manual rollback | ⏳ Pending | - | - |
| 7. npm install fallback | ⏳ Pending | - | - |
| 8. Systemd timer | ⏳ Pending | - | - |
| 9. Log verification | ⏳ Pending | - | - |
| 10. Widget verification | ⏳ Pending | - | - |
