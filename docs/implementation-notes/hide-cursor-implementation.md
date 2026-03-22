# Mouse Cursor Hiding Implementation

**Date:** 2026-03-08
**Commit:** 76e9761c

## Problem

The mouse pointer was visible on the kiosk display, which is not ideal for a clean kiosk appearance.

## Root Cause

The kiosk transitioned from LXDE autostart to systemd user services, but the unclutter command that was previously in the LXDE autostart configuration was not migrated to the new systemd-based setup.

## Solution

Created a separate systemd user service for unclutter that:
- Runs independently from the kiosk.service
- Auto-starts with the kiosk
- Auto-restarts if it crashes
- Is easy to manage and troubleshoot

## Implementation

### New Files

1. **`scripts/systemd/unclutter.service`**
   - Systemd user service template
   - Starts unclutter with `-idle 0.1 -root` flags
   - Depends on default.target, starts before kiosk.service
   - Auto-restart with 3-second delay

2. **`scripts/setup-unclutter.sh`**
   - Installation script for the service
   - Checks if unclutter is installed, installs if missing
   - Copies service file to `~/.config/systemd/user/`
   - Enables and starts the service
   - Verifies service and process are running

### Modified Files

1. **`scripts/kiosk-service.sh`**
   - Added cursor status check to `verify` command
   - Added new commands:
     - `cursor-status` - Check if unclutter is running
     - `hide-cursor` - Start unclutter service
     - `show-cursor` - Stop unclutter service (for debugging)

2. **`scripts/auto-update.sh`**
   - Added unclutter service check after backend restart
   - Ensures unclutter is running before sending browser refresh
   - Auto-starts service if not running during deployment

3. **Documentation Updates:**
   - `docs/DEPLOYMENT_GUIDE.md` - Added Systemd Services section with unclutter documentation
   - `docs/pi2-screen-blanking-fix.md` - Added Cursor Hiding section
   - `CLAUDE.md` - Added Mouse Cursor Hiding section with all commands and notes

## Deployment Instructions

### On Pi (One-Time Setup)

```bash
# SSH into Pi
ssh pi@pi.local

# Run setup script (will be available after next deployment)
sudo bash /var/www/kiosk/scripts/setup-unclutter.sh
```

### Automatic Deployment

The next push to main will:
1. Deploy the new service files via GitHub Actions
2. Auto-update script will ensure unclutter service is running
3. Cursor will be hidden automatically

### Verification

```bash
# From dev machine
./scripts/kiosk-service.sh cursor-status

# From Pi
systemctl --user status unclutter.service
pgrep -f unclutter  # Should show PID
```

## Testing Plan

1. Deploy service file to Pi manually for initial testing
2. Verify service starts and cursor is hidden
3. Test service persistence after reboot
4. Test integration with kiosk.service
5. Test auto-deployment integration
6. Verify cursor visibility/hiding commands work

## Rollback Plan

If unclutter causes issues:

```bash
# Stop and disable service
systemctl --user stop unclutter.service
systemctl --user disable unclutter.service
```

Alternative: Could add `cursor: none;` to CSS as a fallback, but this is less effective as it only hides cursor over the browser window.

## Benefits

1. **Clean Separation**: Unclutter is managed independently from kiosk browser
2. **Easy Troubleshooting**: Can stop service to show cursor for debugging
3. **Automatic Recovery**: Auto-restarts if process crashes
4. **Deployment Integration**: Auto-started during deployments
5. **Management Tools**: Helper commands in kiosk-service.sh

## Alternative Approaches Considered

1. **Add to kiosk.service ExecStartPre**: Would need to background it, harder to manage
2. **CSS-only**: `cursor: none;` only works over browser window, not system cursor
3. **Chromium flag**: No built-in flag for hiding system cursor

Selected approach (separate systemd service) is cleanest and most maintainable.
