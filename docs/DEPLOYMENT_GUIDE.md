# Deployment Guide - Raspberry Pi Kiosk

This guide covers deploying the Kiosk Application to a Raspberry Pi Zero W 2.

## Prerequisites

- Raspberry Pi Zero W 2 with Raspberry Pi OS Lite installed
- SSH access configured
- Network connectivity
- NGINX installed

## Architecture Overview

```
┌─────────────────────────────────────┐
│    Raspberry Pi Zero W 2 (512MB)   │
├─────────────────────────────────────┤
│  NGINX (serve static files)         │ ~10MB RAM
│  Chromium (kiosk mode)              │ ~200MB RAM
├─────────────────────────────────────┤
│  No backend server ✓                │
└─────────────────────────────────────┘
```

## Installation Steps

### 1. Install Required Packages on Pi

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install NGINX
sudo apt install -y nginx

# Install Chromium browser
sudo apt install -y chromium-browser

# Install unclutter (hide mouse cursor)
sudo apt install -y unclutter

# Install xdotool (for refresh automation if needed)
sudo apt install -y xdotool
```

### 2. Configure NGINX

Create NGINX configuration:

```bash
sudo nano /etc/nginx/sites-available/kiosk
```

Add configuration:

```nginx
server {
    listen 80;
    server_name localhost;
    root /var/www/kiosk;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/kiosk /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Create Deployment Directory

```bash
sudo mkdir -p /var/www/kiosk
sudo chown pi:pi /var/www/kiosk
```

### 4. Deploy from Development Machine

From your development machine:

```bash
npm run build
npm run deploy
```

Or manually:

```bash
npm run build
rsync -avz --delete dist/ pi@192.168.50.37:/var/www/kiosk/
```

### 5. Configure Chromium Kiosk Mode

Create autostart script:

```bash
mkdir -p ~/.config/lxsession/LXDE-pi
nano ~/.config/lxsession/LXDE-pi/autostart
```

Add the following content with **optimized flags for Pi Zero W 2**:

```bash
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xscreensaver -no-splash

# Hide mouse cursor after 0.1 seconds of inactivity
@unclutter -idle 0.1 -root

# Start Chromium in kiosk mode with memory optimizations
@chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-features=TranslateUI \
  --check-for-update-interval=31536000 \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --memory-pressure-off \
  --js-flags="--max-old-space-size=256" \
  --disable-gpu \
  --disable-software-rasterizer \
  --disable-dev-shm-usage \
  --no-sandbox \
  --disable-setuid-sandbox \
  http://localhost
```

### Chromium Flags Explained

**Kiosk Mode:**
- `--kiosk` - Full-screen mode without UI elements
- `--noerrdialogs` - Suppress error dialogs
- `--disable-infobars` - Hide information bars
- `--disable-session-crashed-bubble` - No crash notifications

**Memory Optimizations (Critical for 512MB):**
- `--memory-pressure-off` - Disable memory pressure monitoring
- `--js-flags="--max-old-space-size=256"` - Limit V8 heap to 256MB
- `--disable-gpu` - Disable GPU compositing (save memory)
- `--disable-software-rasterizer` - Disable software rasterizer fallback
- `--disable-dev-shm-usage` - Use /tmp instead of /dev/shm (limited on Pi)

**Security/Sandbox:**
- `--no-sandbox` - Disable sandboxing (saves memory, needed on Pi Zero)
- `--disable-setuid-sandbox` - Disable SUID sandbox

**UI Features:**
- `--disable-features=TranslateUI` - No translation prompts
- `--disable-pinch` - Disable pinch-to-zoom
- `--overscroll-history-navigation=0` - Disable swipe navigation

### 6. Auto-Start X Server

If not auto-starting, configure auto-login and X server:

```bash
sudo raspi-config
# Navigate to: System Options -> Boot / Auto Login -> Desktop Autologin
```

Or edit `/etc/systemd/system/getty@tty1.service.d/autologin.conf`:

```ini
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin pi --noclear %I $TERM
```

### 7. Disable Screen Blanking

Edit lightdm configuration:

```bash
sudo nano /etc/lightdm/lightdm.conf
```

Under `[Seat:*]` section, add:

```ini
xserver-command=X -s 0 -dpms
```

Or add to autostart:

```bash
@xset s off
@xset -dpms
@xset s noblank
```

## Memory Management

### Monitor Memory Usage

```bash
# Check overall memory
free -h

# Check process memory
ps aux --sort=-%mem | head -10

# Monitor in real-time
htop
```

### Expected Memory Usage

```
Component              Memory Usage
-----------------------------------
Raspberry Pi OS Lite   ~100MB
NGINX                  ~10MB
Chromium (optimized)   ~150-200MB
-----------------------------------
Total                  ~260-310MB
Free                   ~200-250MB
```

### Emergency Memory Tuning

If experiencing memory issues:

1. **Reduce GPU memory allocation:**
   ```bash
   sudo raspi-config
   # Performance Options -> GPU Memory -> Set to 16MB
   ```

2. **Enable zram compression:**
   ```bash
   sudo apt install -y zram-tools
   sudo nano /etc/default/zramswap
   # Set PERCENTAGE=50
   sudo systemctl restart zramswap
   ```

3. **Further reduce Chromium memory:**
   ```bash
   --js-flags="--max-old-space-size=192"
   ```

## Updating the Application

From your development machine:

```bash
npm run deploy
```

The app will automatically refresh (or add auto-refresh script):

```bash
# On Pi, create refresh script
echo '#!/bin/bash
export DISPLAY=:0
xdotool key F5' > ~/refresh-browser.sh
chmod +x ~/refresh-browser.sh

# Add to deployment
ssh pi@raspberrypizerow2.local '~/refresh-browser.sh'
```

## Monitoring and Maintenance

### Check NGINX Status

```bash
sudo systemctl status nginx
```

### View NGINX Logs

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart Services

```bash
# Restart NGINX
sudo systemctl restart nginx

# Restart X Server (reconnect via SSH first)
sudo systemctl restart lightdm
```

### Auto-Reboot Schedule (Optional)

Reboot daily at 3 AM to clear memory:

```bash
sudo crontab -e
# Add:
0 3 * * * /sbin/shutdown -r now
```

## Troubleshooting

### Chromium Won't Start

1. Check X server is running:
   ```bash
   echo $DISPLAY  # Should show :0 or :0.0
   ```

2. Try starting manually:
   ```bash
   DISPLAY=:0 chromium-browser --kiosk http://localhost
   ```

3. Check for errors:
   ```bash
   cat ~/.xsession-errors
   ```

### Out of Memory Errors

1. Reduce Chromium memory limit
2. Enable zram compression
3. Consider hardware upgrade (Pi 3B+ or 4)

### App Not Loading

1. Check NGINX is running:
   ```bash
   curl http://localhost
   ```

2. Check files are deployed:
   ```bash
   ls -la /var/www/kiosk/
   ```

3. Check browser console:
   - Press F12 in Chromium
   - Look for JavaScript errors

### Network Issues

1. Check WiFi connection:
   ```bash
   iwconfig
   ```

2. Check external API access:
   ```bash
   curl -I https://api.weather.gov
   ```

## Security Considerations

### Firewall (Optional)

```bash
sudo apt install -y ufw
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw enable
```

### Update Regularly

```bash
sudo apt update && sudo apt upgrade -y
```

### Secure SSH

1. Use SSH keys instead of passwords
2. Disable password authentication
3. Change default port (optional)

## Performance Tips

1. **Use Raspberry Pi OS Lite** - No desktop environment overhead
2. **Minimize background services** - Disable unused services
3. **Use static IP** - Faster network resolution
4. **Regular reboots** - Clear accumulated memory leaks
5. **Monitor temperature** - Ensure adequate cooling

## API Configuration

Since there's no backend, API keys and configurations are managed client-side:

### Environment Variables (Build Time)

Create `.env.production`:

```env
VITE_WEATHER_API_KEY=your_api_key_here
VITE_CALENDAR_CLIENT_ID=your_google_client_id
```

These are embedded at build time.

### Runtime Configuration

Widget configurations are stored in browser localStorage. To reset:

```javascript
// In browser console
localStorage.clear();
location.reload();
```

## Next Steps

- Set up automated deployments with GitHub Actions
- Configure monitoring/alerting
- Implement health check endpoint
- Add remote configuration capability
