# Phase 4: Setup Wizard - Testing Guide

## What Was Implemented

Phase 4 adds a complete multi-step wizard for first-time setup accessible from mobile devices.

### New Components

1. **`src/components/admin/pages/SetupWizard.tsx`**
   - 3-step wizard with progress indicator
   - Step 1: Enter 6-character code from TV
   - Step 2: Create and confirm 4-8 digit PIN
   - Step 3: Enter basic config (latitude, longitude, grid fee)
   - Form validation at each step
   - Calls `completeSetup()` API on submission
   - Redirects to `/admin/settings` on success

2. **Updated `SetupPage.tsx`**
   - Checks for existing setup code on load
   - Shows button to go to wizard when code exists
   - Provides option to enter code directly (for mobile users)

3. **Updated `AdminRouter.tsx`**
   - Added `/admin/setup/wizard` route
   - Improved redirect logic to not interrupt wizard flow

## Testing Instructions

### Prerequisites

1. Build backend:
   ```bash
   cd server
   npm run build
   cd ..
   ```

2. Clean existing data:
   ```bash
   rm -rf server/data
   ```

### Manual Testing

#### Terminal 1: Start Backend
```bash
cd server
node dist/index.js
```

You should see:
```
Loaded env from: /Users/espen/code/kiosk-app/.env
Photo proxy server running on port 3001
```

#### Terminal 2: Start Frontend
```bash
npm run dev
```

You should see:
```
VITE v... ready in ...ms
➜ Local: http://localhost:3000/
```

### Test Flow: Complete Setup

1. **Initial State**
   - Visit: http://localhost:3000/admin
   - Should auto-redirect to `/admin/setup`
   - Should show "First-Time Setup" page

2. **Generate Code (TV Display)**
   - Click "Start Setup (TV Display)"
   - Large code should appear (e.g., "QRXBCK")
   - Should show "Enter this code on your phone or laptop"
   - Should show countdown timer (15 minutes)

3. **Open Wizard (Mobile Device Simulation)**
   - Open new browser window/tab (simulating mobile device)
   - Visit: http://localhost:3000/admin/setup/wizard
   - Should see step 1 of 3: "Setup Kiosk"

4. **Step 1: Enter Code**
   - Enter the 6-character code from TV
   - Click "Next"
   - Should advance to step 2

5. **Step 2: Create PIN**
   - Enter a 4-8 digit PIN (e.g., "1234")
   - Re-enter same PIN to confirm
   - Click "Next"
   - Should advance to step 3

6. **Step 3: Configure**
   - Default values should be pre-filled:
     - Latitude: 63.4325
     - Longitude: 10.6379
     - Grid Fee: 0.36
   - Click "Complete Setup"
   - Should show "Completing Setup..." briefly

7. **Verification**
   - Should redirect to `/admin/settings`
   - Should show "Settings Page (TODO)" (placeholder)
   - Backend should have created:
     - `server/data/auth.json` (PIN hash, salt)
     - `server/data/config.enc.json` (encrypted config)
     - `server/data/machine.secret` (encryption key)

### Test Flow: Validation Errors

1. **Invalid Code**
   - In wizard step 1, enter "ABC" (too short)
   - Click "Next"
   - Should show error: "Code must be 6 characters"

2. **PIN Mismatch**
   - In wizard step 2, enter "1234" for PIN
   - Enter "5678" for confirm
   - Click "Next"
   - Should show error: "PINs do not match"

3. **Invalid PIN Length**
   - Enter "12" (too short)
   - Click "Next"
   - Should show error: "PIN must be 4-8 digits"

4. **Invalid Location**
   - In step 3, enter "999" for latitude
   - Click "Complete Setup"
   - Should show error: "Invalid latitude (must be between -90 and 90)"

5. **Wrong Setup Code**
   - Complete wizard with wrong code
   - Should show error: "Invalid setup code"

6. **Expired Code**
   - Wait 15 minutes (or modify backend to expire immediately)
   - Try to complete setup
   - Should show error: "Setup code expired"

### Test Flow: Navigation

1. **Back Button**
   - Enter code, go to step 2
   - Click "Back" - should return to step 1
   - Data should be preserved

2. **Direct URL Access**
   - Complete full setup
   - Visit `/admin/setup/wizard` directly
   - Should redirect to `/admin/settings` (already set up)

3. **Multiple Devices**
   - Generate code on TV
   - Open wizard on Device A, enter code
   - Open wizard on Device B, enter same code
   - First device to complete should succeed
   - Second device should fail (code already used)

### Verify Backend Data

After successful setup:

```bash
# Check auth data (not encrypted)
cat server/data/auth.json | jq .

# Should show:
# {
#   "pinHash": "...",
#   "salt": "...",
#   "setupComplete": true
# }

# Check encrypted config (should be unreadable)
cat server/data/config.enc.json

# Check machine secret (should be binary)
xxd server/data/machine.secret | head -5
```

### API Testing (curl)

```bash
# 1. Check initial state
curl -s http://localhost:3001/api/auth/status | jq .

# 2. Generate code
CODE=$(curl -s -X POST http://localhost:3001/api/auth/init-setup | jq -r '.firstTimeCode')
echo "Code: $CODE"

# 3. Complete setup
curl -s -X POST http://localhost:3001/api/auth/complete-setup \
  -H "Content-Type: application/json" \
  -c /tmp/cookies.txt \
  -d "{
    \"code\": \"$CODE\",
    \"pin\": \"1234\",
    \"config\": {
      \"location\": {\"latitude\": 63.4325, \"longitude\": 10.6379, \"stopPlaceIds\": []},
      \"apiKeys\": {\"tibber\": \"\"},
      \"electricity\": {\"gridFee\": 0.36},
      \"photos\": {\"sharedAlbumUrl\": \"\", \"interval\": 30},
      \"calendar\": {\"calendars\": []}
    }
  }" | jq .

# 4. Verify config
curl -s http://localhost:3001/api/config -b /tmp/cookies.txt | jq .
```

## Expected Results

✓ Setup wizard displays 3 steps with progress indicator
✓ Each step validates input before proceeding
✓ Back button preserves form data
✓ Setup completes successfully with valid data
✓ Encrypted config file created on backend
✓ Session cookie set for immediate access
✓ Redirect to settings page after completion
✓ Invalid codes/PINs show appropriate errors
✓ Expired codes are rejected

## Troubleshooting

### Code Not Appearing
- Check backend logs: `tail -f /tmp/backend.log`
- Verify `/api/auth/init-setup` endpoint responds
- Check browser console for errors

### Wizard Not Loading
- Check frontend dev server is running
- Verify route is registered in AdminRouter
- Check browser console for import errors

### Setup Fails with "Invalid Code"
- Ensure code is entered exactly as displayed (case-sensitive)
- Verify code hasn't expired (15 min limit)
- Check backend logs for detailed error

### Redirect Not Working
- Check `route()` function is imported from preact-router
- Verify AuthRouter redirect logic
- Check browser console for routing errors

## Next Steps

After Phase 4 is verified:
- **Phase 5**: Login & Settings UI (settings management interface)
- **Phase 6**: CLI Tool & Factory Reset (SSH recovery)
- **Phase 7**: Config Migration & Integration (sync with ConfigContext)
