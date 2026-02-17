# Kiosk App

A full-screen dashboard application for Raspberry Pi Zero W 2, displaying widgets like clock, weather, calendar, photos, and public transport information.

## Prerequisites

- Node.js 18+
- npm

## Quick Start

```bash
npm install
npm run dev        # Development server at http://localhost:3000
npm run build      # Production build
npm run deploy     # Build and deploy to Raspberry Pi
```

### New Dev Machine Setup

If this is a fresh clone on a new machine, run the setup script to configure SSH access to the Pi:

```bash
bash scripts/setup-deploy.sh
```

This checks SSH connectivity (mDNS then static IP), verifies tools are installed, and guides you through `ssh-copy-id` if needed.

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm run deploy` | Build and deploy to Pi |
| `npm run preview` | Preview production build locally |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm test` | Puppeteer tests |

## Tech Stack

- **Frontend:** Preact (React-compatible, 3KB) + TypeScript + Vite
- **Styling:** Tailwind CSS (static, no runtime overhead)
- **State:** React Context API + localStorage persistence
- **Testing:** Puppeteer
- **Bundle:** ~66 KB total (13 KB CSS + 53 KB JS)
- **Target:** Raspberry Pi Zero W 2 (512MB RAM)

## Deployment

### Automatic Deployment (Recommended)

Push to main → GitHub Actions builds → Pi auto-updates within 5 minutes.

```bash
git push origin main  # That's it!
```

**Pi commands:**
```bash
/var/www/kiosk/scripts/auto-update.sh status    # Check version
/var/www/kiosk/scripts/auto-update.sh update    # Force update now
/var/www/kiosk/scripts/auto-update.sh rollback  # Rollback to previous
```

### Manual Deployment

```bash
npm run deploy  # Build and rsync to Pi
```

### Target Device

| Property | Value |
|----------|-------|
| Device | Raspberry Pi Zero W 2 |
| OS | Raspberry Pi OS |
| IP | 192.168.50.37 |
| mDNS | raspberrypizerow2.local |
| Deploy user | pi |
| Web server | nginx + Node.js (photo proxy) |
| Web root | /var/www/kiosk/dist/ |
| URL | http://raspberrypizerow2.local/ |

### Pi Setup (one-time)

These steps were performed to set up the Pi as a deployment target.

#### 1. Create deploy user

SSH in as admin user and create the `pi` user:

```bash
ssh espen@192.168.50.37
sudo useradd -m -s /bin/bash pi
sudo passwd pi
sudo mkdir -p /home/pi/.ssh
sudo chmod 700 /home/pi/.ssh
sudo chown -R pi:pi /home/pi/.ssh
```

#### 2. SSH key auth

From your dev machine, copy your public key:

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub pi@192.168.50.37
```

Verify: `ssh pi@192.168.50.37 "echo 'Success'"`

#### 3. Install and configure nginx

SSH in as admin user:

```bash
ssh espen@192.168.50.37
sudo apt-get update && sudo apt-get install -y nginx
```

Create the site config:

```bash
sudo tee /etc/nginx/sites-available/kiosk > /dev/null <<'EOF'
server {
    listen 80 default_server;
    root /var/www/kiosk;
    index index.html;
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/kiosk /etc/nginx/sites-enabled/kiosk
sudo nginx -t && sudo systemctl restart nginx
```

#### 4. Create web root

```bash
sudo mkdir -p /var/www/kiosk
sudo chown pi:pi /var/www/kiosk
```

### Deploy

**Automatic (after initial setup):**
Just push to main - the Pi polls GitHub and auto-deploys within 5 minutes.

**Manual:**
```bash
npm run deploy
```

This checks Pi connectivity (tries mDNS `raspberrypizerow2.local` first, falls back to `192.168.50.37`), builds the app, and rsyncs to the Pi.

### Enable Auto-Deploy on Pi (one-time)

After the first manual deploy:

```bash
# On the Pi
sudo chown pi:pi /var/www
sudo bash /var/www/kiosk/scripts/setup-auto-deploy.sh
```

If SSH isn't set up yet, run `bash scripts/setup-deploy.sh` for guided setup.

### USB Gadget Mode (alternative to WiFi)

The Pi Zero W 2 can be accessed over a USB cable using USB gadget mode, useful when WiFi isn't available.

**On the Pi** (one-time setup):

1. Edit `/boot/config.txt`, add at the end:
   ```
   dtoverlay=dwc2
   ```

2. Edit `/boot/cmdline.txt`, add after `rootwait`:
   ```
   modules-load=dwc2,g_ether
   ```

3. Edit `/etc/dhcpcd.conf`, add at the end:
   ```
   interface usb0
   static ip_address=192.168.42.1/24
   ```

4. Reboot the Pi.

**On your dev machine:**

1. Connect USB cable to the Pi's **center USB-C port** (data port, not power-only).

2. Configure the network interface:
   ```bash
   sudo ip addr add 192.168.42.129/24 dev usb0
   sudo ip link set usb0 up
   ```

3. Deploy over USB:
   ```bash
   rsync -avz --delete dist/ pi@192.168.42.1:/var/www/kiosk/
   ```

### Chromium Kiosk Mode

For running as a full-screen kiosk on the Pi:

```bash
chromium-browser \
  --kiosk http://localhost/ \
  --disable-gpu \
  --disable-software-rasterizer \
  --disable-extensions \
  --disable-sync \
  --disable-translate \
  --disable-background-networking \
  --disable-default-apps \
  --no-first-run \
  --noerrdialogs \
  --memory-pressure-off \
  --js-flags="--max-old-space-size=256"
```

See [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for the full deployment guide including auto-start, screen blanking, memory management, and troubleshooting.

## Project Structure

```
src/
  App.tsx                           # Main application
  main.tsx                          # Entry point
  components/
    layout/DashboardLayout.tsx      # Fixed vertical layout
    sections/                       # Dashboard sections
      Header/                       # Clock, date, weather
      PhotoSlideshow/               # iCloud photos
      Calendar/                     # Google Calendar
      Electricity/                  # Tibber prices
      Transport/                    # Entur departures
    settings/ConfigPanel.tsx        # Settings drawer
  contexts/                         # React Context providers
  hooks/                            # Custom hooks (useWeather, usePhotos, etc.)
  services/                         # API services (weather, tibber, entur, etc.)
server/                             # Photo proxy server (Node.js)
scripts/                            # Deployment and setup scripts
  auto-update.sh                    # Pi auto-update script
  setup-auto-deploy.sh              # One-time Pi setup
.github/workflows/                  # GitHub Actions CI/CD
```

## Project Status

**Dashboard sections complete:**
- Header (clock, date, weather via Met.no)
- Photo slideshow (iCloud Shared Album via backend proxy)
- Calendar (Google Calendar)
- Electricity (Tibber prices + live consumption)
- Transport (Entur bus departures)

**Infrastructure complete:**
- Automatic deployment via GitHub Actions
- Photo proxy server with URL refresh
- Pi auto-update with rollback support

**Next:** Admin interface for remote configuration

## Documentation

- [CLAUDE.md](CLAUDE.md) - Architecture and widget development guide
- [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) - Full deployment and operations guide
- [docs/TECH_STACK_AUDIT.md](docs/TECH_STACK_AUDIT.md) - Technology audit
- [docs/PHASE_2_OPTIMIZATION_PLAN.md](docs/PHASE_2_OPTIMIZATION_PLAN.md) - Optimization plan and results
