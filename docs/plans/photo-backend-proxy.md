# Photo Slideshow Backend Proxy Implementation

## Problem
iCloud photo URLs expire after ~2 hours and return 401 Unauthorized. The current cron-based `photos.json` approach leaves the frontend unable to recover from expired URLs.

## Solution
Create a lightweight Node.js backend proxy that fetches fresh iCloud URLs on-demand with caching.

## Architecture Overview

```
Frontend (Vite)          Nginx              Node.js Server
    |                      |                      |
    |-- GET /api/photos -->|-- proxy to :3001 -->|
    |                      |                      |-- Check cache
    |                      |                      |-- If expired: fetch from iCloud API
    |                      |                      |-- Return fresh URLs
    |<-- JSON response ----|<--------------------|
```

## New Directory Structure

```
kiosk-app/
├── server/                    # NEW: Backend proxy
│   ├── src/
│   │   ├── index.ts          # HTTP server (native Node.js, no Express)
│   │   ├── photos.ts         # iCloud API integration
│   │   ├── cache.ts          # In-memory cache (45-min TTL)
│   │   └── types.ts          # Shared types
│   ├── package.json
│   └── tsconfig.json
├── scripts/
│   ├── setup-photo-server.sh # NEW: Pi setup script
│   └── kiosk-photos.service  # NEW: systemd service file
└── src/                      # Existing frontend (minor changes)
```

## Files to Create

### 1. `server/src/index.ts` - HTTP Server
- Native Node.js `http` module (no Express - saves ~10MB RAM on Pi)
- Endpoints: `GET /api/photos`, `GET /api/health`
- Reads `ICLOUD_ALBUM_URL` from `.env`
- Runs on port 3001

### 2. `server/src/photos.ts` - iCloud API Integration
Port sync-photos.sh logic to TypeScript:
- Extract token from album URL
- Calculate partition from first character (base36)
- POST to `webstream` endpoint for photo metadata
- Handle redirect to correct partition
- POST to `webasseturls` for download URLs
- Assemble full URLs: `https://{url_location}{url_path}`

### 3. `server/src/cache.ts` - Caching Layer
- Cache TTL: 45 minutes (URLs expire at ~2 hours)
- Max stale: 90 minutes (serve stale on iCloud error)
- Simple in-memory cache (no Redis needed)

### 4. `scripts/kiosk-photos.service` - systemd Service
```ini
[Unit]
Description=Kiosk Photo Proxy Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/var/www/kiosk/server
ExecStart=/usr/bin/node /var/www/kiosk/server/dist/index.js
Restart=always
RestartSec=10
Environment=PORT=3001

[Install]
WantedBy=multi-user.target
```

### 5. `scripts/setup-photo-server.sh` - Pi Setup
- Install systemd service
- Update Nginx to proxy `/api/*` to Node.js server
- Enable auto-start on boot

## Files to Modify

### 1. `src/services/photos.ts`
Change from static JSON to API call:
```typescript
// Before
const response = await fetch(`/photos.json?_=${Date.now()}`);

// After
const response = await fetch('/api/photos');
const data = await response.json();
return { photos: data.photos };
```

### 2. `src/hooks/usePhotos.ts`
- Reduce client-side cache from 30 min to 5 min (server handles real caching)
- Add error handling for API failures

### 3. `vite.config.ts`
Add dev proxy:
```typescript
server: {
  proxy: {
    '/api': 'http://localhost:3001'
  }
}
```

### 4. `scripts/deploy.sh`
Add server deployment steps:
- Build server TypeScript
- rsync server/dist to Pi
- Restart systemd service

## API Response Format

### `GET /api/photos`
```json
{
  "photos": [
    { "url": "https://cvws.icloud-content.com/..." }
  ],
  "cached": true,
  "expiresAt": "2024-02-16T15:30:00Z"
}
```

### `GET /api/health`
```json
{
  "status": "ok",
  "uptime": 3600,
  "cacheAge": 1200,
  "photoCount": 42
}
```

## Nginx Configuration (on Pi)

```nginx
server {
    listen 80;
    root /var/www/kiosk;

    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Memory Estimate (Pi Zero W 2 - 512MB)

| Component | RAM |
|-----------|-----|
| Node.js server | ~35MB |
| Chromium | ~300MB |
| System | ~100MB |
| **Available** | ~75MB buffer |

## Implementation Order

1. Create `server/` directory with package.json, tsconfig.json
2. Implement `server/src/photos.ts` (port iCloud API logic)
3. Implement `server/src/cache.ts` (simple caching)
4. Implement `server/src/index.ts` (HTTP server)
5. Add dev proxy to `vite.config.ts`
6. Update `src/services/photos.ts` for API calls
7. Update `src/hooks/usePhotos.ts` cache timing
8. Create systemd service file
9. Create Pi setup script
10. Update deploy script

## Verification

1. **Local dev**: Run `npm run dev` + `cd server && npm run dev`, verify photos load
2. **Cache test**: Call `/api/photos` twice, verify second is cached
3. **Expiry test**: Wait for cache expiry, verify fresh fetch
4. **Pi deploy**: Deploy and verify photos display on kiosk
5. **Reboot test**: Reboot Pi, verify server auto-starts

## Fallback

Keep existing `scripts/sync-photos.sh` and cron job as backup. If Node.js server fails, cron can still regenerate `photos.json` and frontend can fall back to static file.
