# Local Testing Guide - Configuration Persistence Fix

## Prerequisites
✅ Dev servers are running on:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Quick Verification Tests

### Test 1: Auto-Save Endpoint Exists ✅
```bash
# This should return 401 (requires auth)
curl -X PATCH http://localhost:3001/api/config/auto
```
**Expected:** `{"error":"Authentication required"}` or `{"error":"Session expired"}`

### Test 2: Timestamp in Config (Requires PIN)
Run this test script:
```bash
node test-auto-save.js YOUR_PIN_HERE
```

**What it tests:**
1. Authenticates with your PIN
2. Gets current config
3. Modifies grid fee slightly
4. Calls auto-save endpoint
5. Verifies timestamp was added
6. Confirms changes persisted

**Expected output:**
```
=== Testing Configuration Auto-Save ===

1. Checking authentication status...
   Status: Setup complete

2. Logging in...
   ✅ Login successful

3. Getting current config...
   Current timestamp: 1234567890
   Tibber API key: ***5678

4. Testing auto-save endpoint...
   ✅ Auto-save successful!
   New timestamp: 1234567891
   Grid fee (day): 0.4000

5. Verifying config was persisted...
   Verified timestamp: 1234567891
   Grid fee (day): 0.4000
   ✅ Timestamp matches!
   ✅ Grid fee was persisted!

6. Checking public config...
   Has apiKeys: true
   Has electricity: true

=== All Tests Passed! ✅ ===
```

### Test 3: Browser Testing (Manual)

#### Test 3a: Auto-Save During Editing
1. Open http://localhost:3000/admin/login
2. Log in with your PIN
3. Navigate to Settings page
4. Open Browser DevTools (F12) → Console tab
5. Start editing the Tibber API key field (don't save yet)
6. **Watch console** - you should see:
   ```
   [ConfigContext] Skipping sync (user is editing)
   ```
7. Click "Save Changes" and enter PIN
8. **Watch console** - you should see:
   ```
   [ConfigContext] Synced config from server
   ```

#### Test 3b: Auto-Save After Manual Save
1. In Settings page, make a small change (e.g., change grid fee from 0.3604 to 0.3700)
2. Save with PIN
3. **Wait 2-3 seconds**
4. **Watch console** - you should see:
   ```
   [ConfigContext] Auto-saved config to server {timestamp: 1234567890}
   ```
5. Reload the page (Ctrl+R or Cmd+R)
6. Navigate back to Settings
7. **Verify:** Grid fee is still 0.3700

#### Test 3c: Timestamp Conflict Detection
1. Open Settings page in two tabs (Tab 1 and Tab 2)
2. In Tab 1: Change grid fee to 0.4000 → Save
3. In Tab 2: Change grid fee to 0.5000 → Save
4. Reload both tabs
5. **Watch console in both tabs** - you should see:
   ```
   [ConfigContext] Server config is newer {local: X, server: Y, diff: Z}
   ```
6. Both tabs should show 0.5000 (newer save wins)

### Test 4: Server Restart Resilience

1. Make a change in Settings and save (e.g., grid fee = 0.3800)
2. Stop the backend:
   ```bash
   pkill -f "node.*server/dist/index.js"
   # OR
   ./scripts/start-dev.sh stop
   ```
3. Start the backend:
   ```bash
   cd /Users/espen/code/kiosk-app/server && npm run dev &
   # OR
   ./scripts/start-dev.sh
   ```
4. Reload the frontend
5. Navigate to Settings
6. **Verify:** Grid fee is still 0.3800

### Test 5: Check Backend Logs

Monitor auto-save activity:
```bash
# Watch backend logs
tail -f /tmp/kiosk-dev-backend.log

# In another terminal, make changes in the admin UI
# You should see log entries when configs are saved
```

## Automated Tests

### Run All Basic Tests
```bash
./test-basic.sh
```

### Run Auto-Save Test (requires PIN)
```bash
node test-auto-save.js YOUR_PIN
```

## What to Look For

### ✅ Success Indicators:
- Console shows `[ConfigContext] Auto-saved config to server`
- Timestamp increments on each save
- Config persists after page reload
- Config survives backend restart
- Dirty flag prevents race conditions
- No "config not found" errors

### ❌ Failure Indicators:
- Config lost after page reload
- Console shows `Failed to auto-save config`
- Race conditions (edits overwritten)
- Server errors in backend logs
- 401/403 errors in browser console

## Rollback Instructions

If auto-save causes issues:

1. **Disable auto-save immediately:**
   ```bash
   # Comment out auto-save effect in ConfigContext
   # Lines 219-246 in src/contexts/ConfigContext.tsx
   ```

2. **Restart frontend:**
   ```bash
   ./scripts/start-dev.sh restart
   ```

3. **Config will still save with PIN** (explicit save still works)

## Next Steps After Testing

1. ✅ Verify all 5 tests pass
2. ✅ Monitor logs for 24 hours in dev
3. ✅ Test on dev Raspberry Pi
4. ✅ Deploy to production if stable

## Troubleshooting

### "Authentication required" when testing
- Make sure you're logged in to admin
- Check session cookie exists in browser DevTools
- Try logging out and back in

### "Config not found in session"
- Backend session expired
- Restart backend: `./scripts/start-dev.sh restart`

### Auto-save not triggering
- Check browser console for errors
- Verify `isServerBacked: true` in context
- Check dirty flag is false: not currently editing

### Timestamp not incrementing
- Check backend logs for save errors
- Verify machine.secret file exists: `ls -la server/data/`
- Check file permissions on config files

## Files to Monitor

- `/tmp/kiosk-dev-backend.log` - Backend activity
- `server/data/config.enc.json` - Encrypted config (should update)
- `server/data/config.public.json` - Public config (should update)
- Browser DevTools → Console - Frontend logs
- Browser DevTools → Network - API calls

## Questions?

If you encounter issues:
1. Check console logs (frontend and backend)
2. Verify all tests in this guide
3. Review `/docs/implementation-notes/config-persistence-fix.md`
