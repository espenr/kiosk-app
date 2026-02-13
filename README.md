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

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (port 3000) |
| `npm run build` | Production build |
| `npm run deploy` | Build and deploy to Pi |
| `npm run preview` | Preview production build |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm test` | Puppeteer tests |

## Tech Stack

- **Frontend:** Preact (React-compatible, 3KB) + TypeScript + Vite
- **Styling:** Tailwind CSS (static, no runtime overhead)
- **State:** React Context API + localStorage persistence
- **Testing:** Puppeteer
- **Bundle:** ~69 KB total (13 KB CSS + 56 KB JS)
- **Target:** Raspberry Pi Zero W 2 (512MB RAM)

## Deployment

### Target Device

- **Device:** Raspberry Pi Zero W 2
- **IP:** 192.168.50.37
- **User:** pi
- **Web root:** `/var/www/kiosk/`

### SSH Setup (one-time)

1. Generate an SSH key if you don't have one:
   ```bash
   ssh-keygen -t ed25519
   ```

2. Copy your key to the Pi:
   ```bash
   ssh-copy-id pi@192.168.50.37
   ```

3. Verify:
   ```bash
   ssh pi@192.168.50.37 "echo 'Success'"
   ```

### Deploy

```bash
npm run deploy
```

This builds the production bundle and rsyncs it to `/var/www/kiosk/` on the Pi.

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

1. Connect a USB cable to the Pi's **center USB-C port** (data port, not the power-only port).

2. Configure the USB network interface:
   ```bash
   sudo ip addr add 192.168.42.129/24 dev usb0
   sudo ip link set usb0 up
   ```

3. SSH and deploy:
   ```bash
   ssh pi@192.168.42.1
   rsync -avz --delete dist/ pi@192.168.42.1:/var/www/kiosk/
   ```

### Chromium Kiosk Flags

For optimal performance on the Pi Zero W 2:

```bash
chromium-browser \
  --kiosk http://localhost/kiosk/ \
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
  --max-old-space-size=128 \
  --js-flags="--max-old-space-size=128"
```

## Project Structure

```
src/
  App.tsx                           # Main application
  main.tsx                          # Entry point
  components/
    layout/Grid.tsx, GridItem.tsx    # 12x12 CSS grid system
    settings/ConfigPanel.tsx        # Settings drawer
    theme/ThemeWrapper.tsx          # Theme provider
    widgets/                        # Widget components
      clock/                        # Clock widget
      WidgetRegistration.tsx        # Widget type registration
  contexts/                         # React Context providers
  types/                            # TypeScript definitions
docs/                               # Architecture and optimization docs
tests/                              # Puppeteer and manual tests
```

## Project Status

- **Epic 1:** Project Foundation - Complete
- **Epic 2:** Core Widgets - In Progress (Clock done, Weather/Calendar next)
- **Epic 3:** Media & Information Widgets - Planned
- **Epic 4:** Advanced Features - Planned
- **Epic 5:** UI/UX Refinement - Planned
- **Epic 6:** Deployment & Optimization - In Progress

## Documentation

- [CLAUDE.md](CLAUDE.md) - Detailed architecture and widget development guide
- [docs/TECH_STACK_AUDIT.md](docs/TECH_STACK_AUDIT.md) - Technology audit
- [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) - Full deployment guide
- [docs/PHASE_2_OPTIMIZATION_PLAN.md](docs/PHASE_2_OPTIMIZATION_PLAN.md) - Optimization plan and results
