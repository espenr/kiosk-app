# Raspberry Pi 2 Model B Keyring Dialog Fix

## Problem
Chromium kiosk mode showed "Choose password for new keyring" dialog on boot, blocking the kiosk app.

## Solution Implemented

### 1. Deleted Existing Keyring Files
```bash
rm -f ~/.local/share/keyrings/Default*
rm -f ~/.local/share/keyrings/login.keyring
```

### 2. Created Systemd User Service
Created `~/.config/systemd/user/kiosk.service` with:
- Proper environment variables (DISPLAY, XAUTHORITY, DBUS_SESSION_BUS_ADDRESS)
- 5-second delay for X server initialization
- Screen rotation command (xrandr)
- Chromium with kiosk flags and `--password-store=basic`
- Auto-restart on crash

### 3. Enabled Systemd User Lingering
```bash
loginctl enable-linger pi
```
This allows user services to start at boot without requiring user login.

### 4. Updated LXDE Autostart
Removed Chromium and xrandr from `/etc/xdg/lxsession/LXDE/autostart` (now handled by systemd).

### 5. Disabled GNOME Keyring Daemon Autostart
Created `~/.config/autostart/gnome-keyring-*.desktop` files with `Hidden=true`.

## Service Management

### Check Status
```bash
systemctl --user status kiosk.service
```

### Restart Service
```bash
systemctl --user restart kiosk.service
```

### View Logs
```bash
journalctl --user -u kiosk.service -f
```

### Stop Service
```bash
systemctl --user stop kiosk.service
```

### Disable Service
```bash
systemctl --user disable kiosk.service
```

## Verification

### Expected Behavior
- ✅ Pi boots without login screen (LightDM autologin)
- ✅ No keyring password dialog
- ✅ Chromium launches fullscreen in portrait mode
- ✅ Kiosk dashboard loads at http://localhost

### Check Screen Rotation
```bash
DISPLAY=:0 xrandr | grep HDMI
```
Expected: `HDMI-1 connected ... left (normal left inverted right)`

### Check Chromium Process
```bash
ps aux | grep chromium | grep kiosk
```
Should show Chromium running with `--kiosk http://localhost` flag.

## Files Modified

### Created
- `~/.config/systemd/user/kiosk.service` - Systemd service definition
- `~/.config/autostart/gnome-keyring-*.desktop` - Keyring daemon disable files

### Modified
- `/etc/xdg/lxsession/LXDE/autostart` - Removed Chromium and xrandr

### Deleted
- `~/.local/share/keyrings/Default*` - Old keyring files
- `~/.local/share/keyrings/login.keyring` - Login keyring

## Rollback

To revert to LXDE autostart approach:

```bash
# Disable systemd service
systemctl --user disable kiosk.service
systemctl --user stop kiosk.service

# Restore LXDE autostart
sudo tee /etc/xdg/lxsession/LXDE/autostart > /dev/null << 'EOF'
@lxpanel --profile LXDE
@pcmanfm --desktop --profile LXDE
@xscreensaver -no-splash
@xrandr --output HDMI-1 --rotate left
@chromium --kiosk http://localhost --noerrdialogs --disable-infobars --password-store=basic
EOF

# Reboot
sudo reboot
```

## Key Differences from Previous Setup

### Before
- Chromium launched via LXDE autostart
- Unreliable startup timing
- No proper process management
- Keyring dialog appeared on boot

### After
- Chromium managed by systemd user service
- Controlled startup with delays
- Auto-restart on crash
- Proper environment isolation
- No keyring dialog

## Technical Notes

- The `loginctl enable-linger` command is critical for user services to start at boot
- The 5-second delay in ExecStartPre ensures X server is ready
- DBUS_SESSION_BUS_ADDRESS must be set for proper D-Bus communication
- Restart=always ensures kiosk comes back after crashes
- The keyring daemon may still run in background, but it won't prompt for password
