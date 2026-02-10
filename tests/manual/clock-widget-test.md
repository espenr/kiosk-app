# Clock Widget Manual Test Script

Use this script to manually verify the Clock/Date Widget functionality. Follow each step in order and check if the actual result matches the expected result.

## Prerequisites
- Kiosk app running on development server (`npm run dev`)
- Browser open to http://localhost:3000

## Test Script

### 1. Initial Rendering

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1.1 | Observe the application when it first loads | Clock widget should be visible in the top-left corner | |
| 1.2 | Check the time displayed | Time should match your system time in 24-hour format | |
| 1.3 | Check the date displayed | Date should be visible below the time | |
| 1.4 | Wait for ~10 seconds | Time should update automatically with seconds changing | |

### 2. Configuration Panel

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 2.1 | Click the settings (⚙️) icon in the bottom-right corner | Configuration panel should open | |
| 2.2 | Navigate to the "Widgets" tab | Should see "Clock Widget" section with configuration options | |
| 2.3 | Verify available options | Should see options for: <br>- Use 24-hour format<br>- Show seconds<br>- Show date<br>- Date format<br>- Timezone | |

### 3. Time Format Configuration

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 3.1 | Toggle "Use 24-hour format" switch to OFF | Time should immediately update to 12-hour format with AM/PM indicator | |
| 3.2 | Toggle "Use 24-hour format" switch back to ON | Time should revert to 24-hour format | |

### 4. Seconds Display

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 4.1 | Toggle "Show seconds" switch to OFF | Seconds should disappear from the time display | |
| 4.2 | Wait for ~10 seconds | Time should still update (minutes should change after sufficient time) | |
| 4.3 | Toggle "Show seconds" switch back to ON | Seconds should reappear and update properly | |

### 5. Date Display

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 5.1 | Toggle "Show date" switch to OFF | Date should disappear from display | |
| 5.2 | Toggle "Show date" switch back to ON | Date should reappear | |
| 5.3 | If date format dropdown is available, select different formats | Date format should change according to selection | |

### 6. Timezone Testing

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 6.1 | Select a different timezone from the dropdown | Time and date should update to reflect selected timezone | |
| 6.2 | Select a timezone in a significantly different time zone (e.g., if in US, select Tokyo) | Time should show a large difference from local time | |
| 6.3 | Set timezone back to "Local timezone" | Time should match local system time again | |

### 7. Theme Integration

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 7.1 | Go to the "Theme" tab in settings | Theme settings should be visible | |
| 7.2 | Toggle "Dark Mode" switch | Clock widget should adapt to dark/light theme | |
| 7.3 | Change "Base Font Size" value | Clock text size should adjust accordingly | |

### 8. Persistence Testing

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 8.1 | Make several configuration changes (format, seconds, timezone) | Changes should be applied immediately | |
| 8.2 | Close the settings panel | Widget should maintain the configured state | |
| 8.3 | Refresh the browser page | Widget should retain all configuration settings after page reload | |

### 9. Responsive Layout

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 9.1 | Resize the browser window to various sizes | Clock widget should maintain proper formatting | |
| 9.2 | Use browser dev tools to simulate mobile device | Clock should be readable and properly formatted on small screens | |

## Test Results Summary

**Tester Name**: ________________________

**Test Date**: __________________________

**Browser/Version**: ____________________

**Overall Result**: ⬜ Pass  ⬜ Fail

**Notes/Issues**:
```





```

## Next Steps

If any tests failed:
1. Document the specific issue with screenshots if possible
2. Check browser console for errors
3. Note the exact steps to reproduce the issue