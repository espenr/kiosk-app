# Calendar Color Persistence Test

## Current Server Colors (Before Test)
```json
{
  "Espen": "#f97b88",
  "Lene": "#adffbe",
  "Ida": "#e18fff",
  "Markus": "#8bb3f4"
}
```

## Test Steps

### Step 1: Clear Browser State
1. Open Chrome DevTools (F12)
2. Go to Console tab
3. Run: `localStorage.clear()`
4. Close DevTools

### Step 2: Change Calendar Color
1. Navigate to: http://pi.local/admin/login
2. Enter PIN
3. Go to Settings
4. Scroll to Calendar section
5. Change "Espen" color from #f97b88 to **#ff0000** (pure red)
6. Click "Save Settings"
7. Enter PIN in modal
8. Wait for "Settings saved successfully" message

### Step 3: Verify Server Update
```bash
ssh pi@pi.local 'python3 -m json.tool /var/www/kiosk/server/data/config.public.json | grep -A 25 "\"calendar\":"'
```
Expected: Espen color should be #ff0000

### Step 4: Test Persistence (CRITICAL)
1. Hard refresh the admin page (Cmd+Shift+R or Ctrl+Shift+R)
2. Check if Espen's color is still **#ff0000** (red) in the color picker

**BEFORE FIX:** Color would revert to #f97b88 (old pink)
**AFTER FIX:** Color should remain #ff0000 (new red)

### Step 5: Verify Dashboard Updates
1. Open new tab: http://pi.local/
2. Wait 10 seconds (for dashboard polling)
3. Check calendar events - Espen's events should have red background

### Step 6: Verify localStorage Sync
1. Open Chrome DevTools (F12)
2. Go to Application tab → Local Storage → http://pi.local
3. Click on "kiosk_config" key
4. Look for calendar.calendars array
5. Verify Espen's color is #ff0000 (not #f97b88)

## Success Criteria

✅ Server file has new color (#ff0000) after save
✅ Page reload shows new color (#ff0000) in color picker
✅ localStorage has new color (#ff0000) after save
✅ Dashboard shows new color in calendar events
✅ No revert to old color (#f97b88)

## Rollback Test

After confirming fix works, restore original color:
1. Change Espen back to #f97b88
2. Save
3. Verify persistence again
