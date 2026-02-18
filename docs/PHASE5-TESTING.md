# Phase 5: Login & Settings UI - Testing Guide

## What Was Implemented

Phase 5 implements the complete settings management interface with login, configuration editing, and factory reset capabilities.

### New Components

1. **`SettingsPage.tsx`** - Full settings management interface
2. **`RecoveryPage.tsx`** - SSH recovery instructions
3. **`FactoryResetPage.tsx`** - Factory reset with confirmation
4. **`AdminRouter.tsx`** - Updated to use real components

## Testing Instructions

### Prerequisites

1. Complete Phase 4 setup first (or have existing auth data)
2. Backend and frontend servers running:

```bash
# Terminal 1: Backend
cd server
node dist/index.js

# Terminal 2: Frontend
npm run dev
```

## Test Scenarios

### 1. Settings Page - Load Configuration

**Steps:**
1. Complete setup wizard or log in with existing PIN
2. Should auto-redirect to `/admin/settings`
3. Verify settings page loads with current configuration

**Expected Results:**
- ✅ Page displays "Kiosk Settings" header
- ✅ Logout and Factory Reset buttons visible (top-right)
- ✅ All sections rendered: Location, API Keys, Electricity, Photos, Calendar
- ✅ Fields populated with current values from backend
- ✅ Loading spinner shown during initial load

**Verification:**
```bash
# Check what config was loaded
curl -s http://localhost:3001/api/config -b /tmp/cookies.txt | jq .
```

### 2. Edit and Save Configuration

**Steps:**
1. In Settings page, modify some values:
   - Change latitude to 60.0
   - Change grid fee to 0.40
   - Enter Tibber token: "test-token-123"
   - Change photo interval to 60
2. Click "Save Changes"
3. PIN prompt modal should appear
4. Enter your PIN (e.g., "1234")
5. Click "Save"

**Expected Results:**
- ✅ Modal appears with PIN input
- ✅ Save button disabled until PIN entered
- ✅ Success message shows: "✓ Settings saved successfully"
- ✅ Success message disappears after 3 seconds
- ✅ Modal closes automatically
- ✅ Changes persisted to backend

**Verification:**
```bash
# Check updated config
curl -s http://localhost:3001/api/config -b /tmp/cookies.txt | jq '{latitude: .location.latitude, gridFee: .electricity.gridFee, tibber: .apiKeys.tibber}'

# Should show updated values:
# {
#   "latitude": 60,
#   "gridFee": 0.4,
#   "tibber": "test-token-123"
# }
```

### 3. Save with Wrong PIN

**Steps:**
1. Modify any field
2. Click "Save Changes"
3. Enter wrong PIN (e.g., "0000")
4. Click "Save"

**Expected Results:**
- ✅ Error message shown: "Invalid PIN"
- ✅ Modal stays open
- ✅ Can retry with correct PIN
- ✅ Changes not saved to backend

### 4. Save with Invalid PIN Format

**Steps:**
1. Click "Save Changes"
2. Enter "12" (too short)
3. Click "Save"

**Expected Results:**
- ✅ Error shown: "PIN must be 4-8 digits"
- ✅ Modal stays open

### 5. Cancel Save

**Steps:**
1. Modify fields
2. Click "Save Changes"
3. Click "Cancel" in PIN modal

**Expected Results:**
- ✅ Modal closes
- ✅ Changes kept in form (not reverted)
- ✅ No API call made
- ✅ Can save later

### 6. Logout

**Steps:**
1. Click "Logout" button (top-right)

**Expected Results:**
- ✅ Redirects to `/admin/login`
- ✅ Session cookie cleared
- ✅ Accessing `/admin/settings` shows login page
- ✅ Can log back in with PIN

**Verification:**
```bash
# Try to access config without session
curl -s http://localhost:3001/api/config | jq .
# Should return: {"error": "Not authenticated"}
```

### 7. Field Validation

**Test each field type:**

**Latitude:**
- Enter "999" → Save → Should show error "Invalid latitude"
- Enter "-91" → Save → Should show error
- Valid range: -90 to 90

**Longitude:**
- Enter "200" → Save → Should show error "Invalid longitude"
- Valid range: -180 to 180

**Grid Fee:**
- Enter "-0.1" → Save → Should show error "Invalid grid fee"
- Valid: Any positive number

**Photo Interval:**
- Enter "0" → Save → Should accept (though illogical)
- Enter "-5" → Should not accept negative

### 8. External Links

**Steps:**
1. Click "developer.tibber.com" link
2. Click "Google Cloud Console" link

**Expected Results:**
- ✅ Links open in new tab (`target="_blank"`)
- ✅ Links have `rel="noopener noreferrer"` for security

### 9. Recovery Page

**Steps:**
1. From login page, click "Recovery instructions"
2. Or navigate to `/admin/recovery`

**Expected Results:**
- ✅ Page displays SSH recovery instructions
- ✅ Three main sections visible:
  - Step 1: SSH into Pi
  - Step 2: Reset PIN
  - Step 3: Complete Setup
- ✅ Code blocks formatted correctly
- ✅ "Back to Login" button works
- ✅ "Go to Dashboard" button works

### 10. Factory Reset Page

**Steps:**
1. From settings, click "Factory Reset" (top-right)
2. Or from danger zone, click "Factory Reset..."

**Expected Results:**
- ✅ Redirects to `/admin/reset`
- ✅ Warning message displayed prominently
- ✅ Lists all data that will be deleted
- ✅ Shows alternative options (PIN recovery, settings page)

### 11. Factory Reset - Invalid Confirmation

**Steps:**
1. On reset page, enter "reset" (lowercase)
2. Enter PIN
3. Click "Factory Reset"

**Expected Results:**
- ✅ Button stays disabled
- ✅ Error: "Please type RESET to confirm"
- ✅ Nothing deleted

### 12. Factory Reset - Wrong PIN

**Steps:**
1. Type "RESET" (correct)
2. Enter wrong PIN
3. Click "Factory Reset"

**Expected Results:**
- ✅ Error shown: "Invalid PIN"
- ✅ Nothing deleted
- ✅ Can retry

### 13. Factory Reset - Success

**Steps:**
1. Type "RESET" exactly
2. Enter correct PIN (e.g., "1234")
3. Click "Factory Reset"

**Expected Results:**
- ✅ Button shows "Resetting..."
- ✅ Backend deletes all data
- ✅ Redirects to `/admin/setup`
- ✅ Setup page shows "First-Time Setup"

**Verification:**
```bash
# Check data directory
ls -la server/data/
# Should show: No such file or directory (or empty)

# Check auth status
curl -s http://localhost:3001/api/auth/status | jq .
# Should show: {"setupComplete": false, "requiresFirstTimeCode": false}
```

### 14. Settings Persistence

**Steps:**
1. Log in and change settings
2. Save with PIN
3. Logout
4. Log back in
5. Navigate to settings

**Expected Results:**
- ✅ All changed values preserved
- ✅ Settings loaded correctly from encrypted storage

### 15. Direct URL Access

**Test without authentication:**

```bash
# Try to access settings without logging in
curl -s http://localhost:3001/api/config | jq .
# Should return: {"error": "Not authenticated"}
```

**In browser:**
1. Clear cookies / open incognito
2. Visit `/admin/settings` directly
3. Should redirect to `/admin/login`

### 16. Session Expiry

**Steps:**
1. Log in and access settings
2. Wait 2+ hours (or modify session timeout for testing)
3. Try to save changes

**Expected Results:**
- ✅ Session expired
- ✅ Redirects to login
- ✅ Must log in again

## API Testing (curl)

### Complete Test Flow

```bash
# 1. Factory reset
curl -s -X POST http://localhost:3001/api/config/factory-reset \
  -b /tmp/cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"pin": "1234"}' | jq .

# 2. Setup fresh
CODE=$(curl -s -X POST http://localhost:3001/api/auth/init-setup | jq -r '.firstTimeCode')
curl -s -X POST http://localhost:3001/api/auth/complete-setup \
  -c /tmp/cookies.txt \
  -H "Content-Type: application/json" \
  -d "{\"code\": \"$CODE\", \"pin\": \"1234\", \"config\": {\"location\": {\"latitude\": 63.4325, \"longitude\": 10.6379, \"stopPlaceIds\": []}, \"apiKeys\": {\"tibber\": \"\"}, \"electricity\": {\"gridFee\": 0.36}, \"photos\": {\"sharedAlbumUrl\": \"\", \"interval\": 30}, \"calendar\": {\"calendars\": []}}}" | jq .

# 3. Get config
curl -s http://localhost:3001/api/config -b /tmp/cookies.txt | jq .

# 4. Update config
curl -s -X PUT http://localhost:3001/api/config \
  -b /tmp/cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"config": {"location": {"latitude": 60.0, "longitude": 11.0, "stopPlaceIds": []}, "apiKeys": {"tibber": "new-token"}, "electricity": {"gridFee": 0.40}, "photos": {"sharedAlbumUrl": "https://icloud.com/album", "interval": 60}, "calendar": {"calendars": []}}, "pin": "1234"}' | jq .

# 5. Verify update
curl -s http://localhost:3001/api/config -b /tmp/cookies.txt | jq .

# 6. Logout
curl -s -X POST http://localhost:3001/api/auth/logout \
  -b /tmp/cookies.txt | jq .

# 7. Try to access (should fail)
curl -s http://localhost:3001/api/config -b /tmp/cookies.txt | jq .
```

## Performance Testing

### Load Time
- Settings page should load in < 500ms
- Config fetch from backend: < 100ms
- Save operation: < 300ms (includes encryption)

### Network
Check dev tools Network tab:
- GET `/api/config` - One request on page load
- PUT `/api/config` - One request on save
- No polling or unnecessary requests

## Browser Testing

Test in multiple browsers:
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile Safari (iOS)
- ✅ Chrome Mobile (Android)

## Accessibility Testing

- ✅ Tab navigation works through all fields
- ✅ Form labels properly associated
- ✅ Error messages announced
- ✅ Focus management in modal
- ✅ Logout button accessible via keyboard

## Expected File Structure After Tests

```
server/data/
├── auth.json           # PIN hash, salt, setupComplete: true
├── config.enc.json     # Encrypted config
└── machine.secret      # 32-byte encryption key
```

## Troubleshooting

### Settings Not Saving
- Check backend logs: `tail -f /tmp/backend.log`
- Verify PIN is correct
- Check browser console for errors
- Verify `/api/config` endpoint responds

### Config Not Loading
- Check auth status: Is session valid?
- Verify backend has config file
- Check browser console for CORS errors

### Modal Not Closing
- Check if save completed successfully
- Look for JavaScript errors in console
- Verify success state is being set

### Factory Reset Not Working
- Check confirmation text is exactly "RESET"
- Verify PIN is correct
- Check backend logs for errors
- Verify backend has write permissions to data directory

## Next Steps

After Phase 5 verification:
- **Phase 6**: CLI Tool & Factory Reset (SSH recovery implementation)
- **Phase 7**: Config Migration & Integration (sync with ConfigContext)
