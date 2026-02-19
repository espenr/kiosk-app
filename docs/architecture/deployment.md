# Deployment Architecture

## Overview

The kiosk app supports two deployment methods with **identical directory structures**.

## Directory Structure (Standard)

```
/var/www/kiosk/
├── dist/                      # Frontend (Nginx root)
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js    # Vite-bundled JavaScript
│   │   └── index-[hash].css   # Tailwind CSS
│   ├── puppeteer-test.html    # Testing page
│   └── test.html
├── server/                    # Backend API
│   ├── dist/                  # Compiled TypeScript
│   │   ├── index.js
│   │   ├── photos.js
│   │   ├── cache.js
│   │   └── ...
│   ├── data/                  # Runtime data (gitignored)
│   │   ├── auth.json          # PIN hash, setup state
│   │   ├── config.enc.json    # Encrypted config
│   │   ├── config.public.json # Public config (OAuth Client ID)
│   │   └── machine.secret     # Encryption key
│   └── package.json
├── scripts/                   # Maintenance scripts
├── .env                       # iCloud album URL
└── VERSION                    # Current version (auto-deploy only)
```

## Nginx Configuration

```nginx
server {
    listen 80 default_server;
    root /var/www/kiosk/dist;      # Always points to dist/
    index index.html;

    # Proxy API requests to Node.js backend
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Serve frontend (SPA fallback)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Deployment Methods

### Manual Deploy (`npm run deploy`)

**When to use:** Active development, testing changes

**How it works:**
1. Builds frontend: `npm run build` → creates `dist/`
2. Builds backend: `cd server && npm run build` → creates `server/dist/`
3. Rsyncs to Pi: `rsync -avz dist/ pi@raspberrypizerow2.local:/var/www/kiosk/dist/`
4. Restarts services

**Result:** Direct deployment to `/var/www/kiosk/dist/`

### Auto-Deploy (GitHub Actions)

**When to use:** Production releases, atomic updates

**How it works:**
1. Push to `main` branch triggers GitHub Actions
2. CI builds and creates tarball with VERSION file
3. Creates GitHub release with tarball as asset
4. Pi polls GitHub every 5 minutes (`kiosk-updater.timer`)
5. Downloads and extracts to `/var/www/kiosk-releases/v2026.02.19.1/`
6. Atomically switches symlink: `/var/www/kiosk` → `/var/www/kiosk-releases/v2026.02.19.1/`
7. Restarts services

**Result:** Versioned deployment with rollback capability

**Directory structure:**
```
/var/www/kiosk-releases/
├── v2026.02.18.1/
├── v2026.02.19.1/          # Current version
│   ├── dist/               # Frontend files
│   ├── server/dist/
│   ├── scripts/
│   └── VERSION
└── v2026.02.19.2/

/var/www/kiosk -> /var/www/kiosk-releases/v2026.02.19.1  # Symlink
```

**Rollback:**
```bash
cd /var/www
sudo /var/www/kiosk/scripts/auto-update.sh rollback
# Restores previous version atomically
```

## Key Principles

1. **Consistent Structure:** Both methods create `/var/www/kiosk/dist/` for Nginx
2. **Atomic Updates:** Auto-deploy uses symlinks for zero-downtime deployments
3. **Separation of Concerns:**
   - Frontend: Nginx serves static files from `dist/`
   - Backend: Node.js API on port 3001 proxied via `/api/*`
4. **Version Control:** Auto-deploy keeps 3 versions for rollback
5. **Environment Isolation:** `.env` file persists across deployments

## Troubleshooting

### 500 Internal Server Error

**Symptom:** Nginx returns 500 error on all routes

**Cause:** Nginx `root` directive points to wrong directory

**Check:**
```bash
ssh pi@raspberrypizerow2.local "grep 'root' /etc/nginx/sites-available/kiosk"
# Should output: root /var/www/kiosk/dist;
```

**Fix:**
```bash
ssh pi@raspberrypizerow2.local "sudo sed -i 's|root /var/www/kiosk;|root /var/www/kiosk/dist;|' /etc/nginx/sites-available/kiosk && sudo systemctl reload nginx"
```

### Files in wrong location after deploy

**Symptom:** Files at `/var/www/kiosk/index.html` instead of `/var/www/kiosk/dist/index.html`

**Cause:** Old version of `deploy.sh` that flattens directory structure

**Fix:** Update to latest `deploy.sh` (rsync to `$PI_DIR/dist/` not `$PI_DIR/`)

## Migration Guide

If you have an existing installation with files in `/var/www/kiosk/` (flat structure):

```bash
# On Pi:
cd /var/www/kiosk
sudo mkdir -p dist
sudo mv index.html assets/ test.html puppeteer-test.html dist/
sudo systemctl reload nginx

# Verify:
curl http://localhost/
# Should return 200 OK with kiosk dashboard
```
