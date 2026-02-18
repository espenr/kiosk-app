# Phase 7 Manual Testing Guide

Backend tests completed ✅. Now test the frontend integration.

## Prerequisites
- Backend server running on http://localhost:3001 ✅
- Setup completed with PIN: **1234** ✅
- Test config loaded (Trondheim location, gridFee 0.36) ✅

## Frontend Test Flow

### Test 1: Dashboard Loads Config from Server

**Steps:**
1. Start frontend dev server (if not running):
   ```bash
   npm run dev
   ```

2. Open browser to: http://localhost:3000/

3. **Open browser DevTools Console** (F12 → Console tab)

**Expected Results:**
- ✅ Console shows: `[ConfigContext] Loaded config from server`
- ✅ Dashboard loads without errors
- ✅ Weather widget uses server config (lat 63.43, lon 10.64 from our test)

---

### Test 2: Admin Login

**Steps:**
1. Navigate to: http://localhost:3000/admin

2. Should redirect to: http://localhost:3000/admin/login

3. Enter PIN: **1234**

4. Click "Login"

**Expected Results:**
- ✅ Redirects to http://localhost:3000/admin/settings
- ✅ Settings page loads with current config values
- ✅ Shows Latitude: 63.43, Grid Fee: 0.36, Tibber token: updated-token-456

---

### Test 3: Update Settings

**Steps:**
1. In Settings page, change values:
   - Latitude: **62.0**
   - Grid Fee: **0.38**
   - Tibber token: **final-test-token**

2. Click "Save Changes"

3. Enter PIN: **1234** in the modal

4. Click "Save"

**Expected Results:**
- ✅ Success message appears: "Settings saved successfully"
- ✅ Console shows: `[ConfigContext] Synced config from server`
- ✅ Page does NOT reload (just shows success message)

---

### Test 4: Dashboard Reflects Changes

**Steps:**
1. Navigate back to dashboard: http://localhost:3000/

2. Check browser console

**Expected Results:**
- ✅ Console shows: `[ConfigContext] Loaded config from server`
- ✅ Dashboard uses new latitude (62.0) for weather
- ✅ Electricity widget uses new grid fee (0.38)

---

### Test 5: Server Unavailable (Fallback Test)

**Steps:**
1. Stop the backend server:
   ```bash
   lsof -ti:3001 | xargs kill
   ```

2. Reload dashboard (http://localhost:3000/)

3. Check console

**Expected Results:**
- ✅ Console shows: `[ConfigContext] Server unavailable, using localStorage fallback`
- ✅ Dashboard still works (uses cached config)
- ✅ NO errors shown to user
- ✅ Weather/electricity widgets still functional

---

### Test 6: Server Recovery

**Steps:**
1. Restart backend server:
   ```bash
   cd server && node dist/index.js &
   ```

2. Reload dashboard

**Expected Results:**
- ✅ Console shows: `[ConfigContext] Loaded config from server`
- ✅ Dashboard switches back to server config
- ✅ Server values take precedence over localStorage

---

### Test 7: Factory Reset (via Admin UI)

**Steps:**
1. Navigate to: http://localhost:3000/admin/settings

2. Scroll to bottom → Click "Factory Reset..."

3. Type: **RESET**

4. Enter PIN: **1234**

5. Click "Factory Reset"

**Expected Results:**
- ✅ Redirects to http://localhost:3000/admin/setup
- ✅ Backend data deleted (ls server/data/ should be empty)
- ✅ Dashboard falls back to localStorage defaults

---

## Console Log Reference

**Successful Operations:**
```
[ConfigContext] Loaded config from server        ← Dashboard loads from server
[ConfigContext] Synced config from server        ← After settings save
[ConfigContext] Server unavailable, using localStorage fallback  ← Graceful fallback
```

**Error Conditions:**
```
[ConfigContext] Failed to sync with server: Not authenticated
```

---

## Verification Commands

Check server config (with auth):
```bash
curl -s http://localhost:3001/api/config -b /tmp/kiosk-cookies.txt | jq .
```

Check encrypted file:
```bash
ls -lh server/data/config.enc.json
```

Check if server is running:
```bash
curl -s http://localhost:3001/api/health | jq .
```

---

## Known Behaviors

✓ **Config updates don't auto-refresh open dashboards** - This is intentional. User must reload page.

✓ **localStorage still contains data when server-backed** - This is fine. It's used as cache/fallback.

✓ **Server config always wins** - Once setup is complete, server is source of truth.

---

## Success Criteria

All tests pass when:
- [x] Backend API tests completed (8/8 passed)
- [ ] Dashboard loads config from server on mount
- [ ] Settings changes sync to ConfigContext immediately
- [ ] Dashboard gracefully falls back to localStorage when server unavailable
- [ ] No errors shown to user during fallback
- [ ] Console logs clearly indicate config source
- [ ] Existing dashboard features work with server config
- [ ] Config persists through server restart

---

## Troubleshooting

**Dashboard shows stale values:**
- Check console - is it loading from server or localStorage?
- Try hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- Clear localStorage: `localStorage.clear()` in console

**Settings not saving:**
- Check server is running: `curl http://localhost:3001/api/health`
- Check session cookie exists: Check Application → Cookies in DevTools
- Try logging out and back in

**Console shows "Failed to sync":**
- Verify PIN is correct (1234 from our tests)
- Check server logs: `tail /tmp/server.log`
- Restart backend server

