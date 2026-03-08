# Fix Screen Blanking and Login Screen on Raspberry Pi 2 Kiosk

## Problem
After ~10 minutes of inactivity, the kiosk screen went blank and showed the LightDM login screen, hiding the running kiosk application.

## Root Cause
1. **LightDM session locking**: Locked session after ~10 minutes of idle time (612 seconds)
2. **xscreensaver active**: Running from LXDE autostart, contributing to screen blanking
3. **DPMS enabled**: X server Display Power Management with 600-second timeouts
4. **X screen saver timeout**: Set to 600 seconds (10 minutes)

## Solution Implemented

### 1. Disabled DPMS at X Server Level
**File**: `/etc/lightdm/lightdm.conf`

Added under `[Seat:*]` section:
```ini
xserver-command=X -s 0 -dpms
```

This passes flags directly to X server at startup:
- `-s 0` = Disable screen blanking (0 seconds timeout)
- `-dpms` = Disable Display Power Management Signaling

### 2. Removed xscreensaver from LXDE Autostart
**File**: `/etc/xdg/lxsession/LXDE/autostart`

Removed the `@xscreensaver -no-splash` line:
```
@lxpanel --profile LXDE
@pcmanfm --desktop --profile LXDE
```

### 3. Updated kiosk.service for Screen Blanking Prevention
**File**: `~/.config/systemd/user/kiosk.service`

Added `ExecStartPre` command to explicitly disable screen blanking:
```ini
ExecStartPre=/usr/bin/xset s off -dpms
```

Also changed target from `graphical.target` to `default.target` (user services don't have graphical.target).

**Complete service file**:
```ini
[Unit]
Description=Kiosk Chromium Browser
After=default.target
Wants=default.target

[Service]
Type=simple
Environment=DISPLAY=:0
Environment=XAUTHORITY=/home/pi/.Xauthority
Environment=DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus
ExecStartPre=/bin/sleep 5
ExecStartPre=/usr/bin/xrandr --output HDMI-1 --rotate left
ExecStartPre=/usr/bin/xset s off -dpms
ExecStart=/usr/bin/chromium \
    --kiosk http://localhost \
    --noerrdialogs \
    --disable-infobars \
    --password-store=basic \
    --disable-session-crashed-bubble \
    --disable-features=TranslateUI \
    --check-for-update-interval=1 \
    --simulate-critical-update
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
```

## Verification

### Current Status (Post-Fix)
```bash
# Service running
systemctl --user is-active kiosk.service
# Output: active

# DPMS disabled (extension not available)
DISPLAY=:0 xset q | grep -A 2 "DPMS"
# Output: Server does not have the DPMS Extension

# Screen saver timeout is 0 (disabled)
DISPLAY=:0 xset q | grep "timeout:"
# Output: timeout:  0

# xscreensaver not running
pgrep xscreensaver
# Output: (empty - process not found)

# LightDM passes flags to X server
sudo grep xserver-command /etc/lightdm/lightdm.conf
# Output: xserver-command=X -s 0 -dpms

# Service auto-starts with user session
ls ~/.config/systemd/user/default.target.wants/ | grep kiosk
# Output: kiosk.service
```

## Multi-Layer Protection

The fix implements multiple layers of screen blanking prevention:

1. **X Server Level** (via LightDM): X started with `-s 0 -dpms` flags
2. **Session Level** (via xset): Screensaver and DPMS explicitly disabled when kiosk starts
3. **Process Level**: xscreensaver daemon not running
4. **Cursor Hiding**: Unclutter service automatically hides mouse cursor

This ensures the screen stays on continuously even if one mechanism fails.

## Cursor Hiding (Unclutter Service)

The mouse cursor is hidden using a separate systemd user service for unclutter.

**Service File**: `scripts/systemd/unclutter.service`

**Setup**:
```bash
sudo bash /var/www/kiosk/scripts/setup-unclutter.sh
```

**Management**:
```bash
# Check status
systemctl --user status unclutter.service

# Stop (makes cursor visible for debugging)
systemctl --user stop unclutter.service

# Start (hides cursor)
systemctl --user start unclutter.service
```

The unclutter service:
- Starts automatically with the kiosk service
- Hides cursor after 0.1 seconds of inactivity
- Uses `-root` flag for root window cursor hiding
- Auto-restarts if it crashes
- Is managed independently from the kiosk service

## Expected Behavior

After these changes:
- ✅ Screen stays on indefinitely without blanking
- ✅ No login screen appears after idle time
- ✅ Chromium kiosk remains visible and running 24/7
- ✅ Service auto-starts on boot (with user linger enabled)
- ✅ Service restarts automatically if Chromium crashes

## Files Modified

1. `/etc/lightdm/lightdm.conf` - Added `xserver-command=X -s 0 -dpms`
2. `/etc/xdg/lxsession/LXDE/autostart` - Removed xscreensaver line
3. `~/.config/systemd/user/kiosk.service` - Added xset command, changed to default.target

## Commands Used

```bash
# Step 1: Configure LightDM
sudo sed -i '86a xserver-command=X -s 0 -dpms' /etc/lightdm/lightdm.conf

# Step 2: Remove xscreensaver from LXDE
sudo tee /etc/xdg/lxsession/LXDE/autostart > /dev/null << 'EOF'
@lxpanel --profile LXDE
@pcmanfm --desktop --profile LXDE
EOF

# Step 3: Update kiosk.service (see complete file above)

# Step 4: Reload and restart
systemctl --user daemon-reload
systemctl --user enable kiosk.service
pkill chromium  # Kill any existing instances

# Step 5: Reboot (required for LightDM changes)
sudo reboot
```

## Troubleshooting

### Service doesn't auto-start after reboot
Check if user linger is enabled:
```bash
loginctl show-user pi | grep Linger
# Should show: Linger=yes
```

If not, enable it:
```bash
loginctl enable-linger pi
```

### Screen still blanks
Verify all settings:
```bash
# Check DPMS
DISPLAY=:0 xset q | grep DPMS

# Check screen saver timeout
DISPLAY=:0 xset q | grep "timeout:"

# Should show timeout: 0
```

Re-run the xset command manually:
```bash
DISPLAY=:0 xset s off -dpms
```

### Login screen appears
Check LightDM logs for session locking:
```bash
sudo journalctl -u lightdm --since "10 minutes ago" | grep -i lock
```

Should show NO "Locking" or "greeter session" messages.

## Related Documentation

- [Pi 2 Keyring Dialog Fix](./pi2-keyring-fix.md) - Initial systemd service setup
- [Deployment Architecture](./architecture/deployment.md) - Overall kiosk architecture
