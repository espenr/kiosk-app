# Admin View Implementation Plan

## Overview

Add a secure administrative interface to the kiosk app, accessible via browser from any device on the local network. Configuration will be stored server-side (encrypted) instead of localStorage.

## Architecture

```
┌─────────────────┐     ┌─────────────────────────────────────────┐
│  Admin Device   │     │           Raspberry Pi                  │
│  (Phone/Laptop) │     │                                         │
│                 │HTTP │  ┌─────────────┐    ┌───────────────┐   │
│  /admin/*       ├────►│  │  Nginx :80  │───►│ Node.js :3001 │   │
│                 │     │  └─────────────┘    └───────┬───────┘   │
└─────────────────┘     │                             │           │
                        │                    ┌────────▼────────┐  │
┌─────────────────┐     │                    │ config.json     │  │
│  Kiosk Display  │     │                    │ (encrypted)     │  │
│  (TV Browser)   │HTTP │                    └─────────────────┘  │
│  /              ├────►│                                         │
└─────────────────┘     └─────────────────────────────────────────┘
```

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Config storage | Server-side JSON file | Survives browser clear, accessible from any device |
| Authentication | 4-8 digit PIN | Simple for home use, no password management |
| First-time setup | Display code on TV | No keyboard needed, proves physical access |
| PIN recovery | SSH reset command | Secure, requires Pi access |
| Admin routing | Single SPA with preact-router | Keep bundle simple, reuse existing patterns |
| Backend framework | Keep native HTTP | Memory efficient for Pi Zero |

## User Flows

### First-Time Setup
1. Pi boots with no `config.json` → backend generates 6-char setup code
2. Kiosk TV displays: "Setup required. Go to http://192.168.x.x/admin, Code: ABC123"
3. User visits `/admin` on phone → enters code → sets 4-8 digit PIN
4. User completes setup wizard → config saved to `config.json`
5. Kiosk refreshes and shows dashboard

### Normal Admin Access
1. User visits `/admin` on phone → redirected to `/admin/login`
2. Enters PIN → session cookie set (7-day expiry, 2-hour idle timeout)
3. Access settings page → modify config → save
4. Kiosk receives update via polling `/api/config`

### PIN Recovery (Forgot PIN)
1. User SSHs into Pi: `ssh pi@192.168.50.37`
2. Runs: `sudo kiosk-admin reset-pin`
3. Recovery code displayed on TV screen (5-minute expiry)
4. User enters code at `/admin/recovery` → sets new PIN

### Factory Reset
1. Authenticated user navigates to `/admin/reset`
2. Types "NULLSTILL" to confirm
3. Config wiped, kiosk shows setup screen

---

## API Endpoints

### Authentication
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/auth/status` | - | Check if setup complete, session valid |
| POST | `/api/auth/setup` | Setup code | First-time: create PIN |
| POST | `/api/auth/login` | - | Authenticate with PIN |
| POST | `/api/auth/logout` | Session | Invalidate session |
| POST | `/api/auth/recovery` | Recovery code | Reset PIN |

### Configuration
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/config` | - | Get config (masked sensitive values) |
| GET | `/api/config/full` | Session | Get full config (unmasked) |
| PUT | `/api/config` | Session | Update config |

### System
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | - | Server status (existing, enhanced) |
| POST | `/api/system/reset` | Session | Factory reset |
| GET | `/api/photos` | - | Photo URLs (existing) |

---

## Data Storage

### File: `/var/www/kiosk/config/config.json`

```json
{
  "version": 1,
  "admin": {
    "pinHash": "$scrypt$...",
    "createdAt": "2024-02-16T00:00:00Z",
    "failedAttempts": 0,
    "lockedUntil": null
  },
  "sessions": [
    { "id": "abc123", "createdAt": "...", "lastActivity": "...", "userAgent": "..." }
  ],
  "config": {
    "location": { "latitude": 63.4325, "longitude": 10.6379, "stopPlaceIds": ["..."] },
    "apiKeys": { "tibber": "encrypted:..." },
    "electricity": { "gridFee": 0.36 },
    "photos": { "sharedAlbumUrl": "encrypted:...", "interval": 30 },
    "calendar": { "clientId": "encrypted:...", "calendars": [...] }
  }
}
```

### Encryption
- Sensitive values encrypted with AES-256-GCM
- Key derived from machine secret (`/var/www/kiosk/config/.secret`) + PIN hash
- Machine secret: 32 random bytes, generated on first setup

---

## Frontend Routes

| Path | Component | Auth | Description |
|------|-----------|------|-------------|
| `/` | App (Dashboard) | - | Kiosk display |
| `/admin` | AdminRouter | - | Redirects based on state |
| `/admin/setup` | SetupWizard | Setup code | First-time configuration |
| `/admin/login` | LoginPage | - | PIN entry |
| `/admin/settings` | SettingsPage | Session | Config management |
| `/admin/recovery` | RecoveryPage | Recovery code | PIN reset |
| `/admin/reset` | ResetPage | Session | Factory reset |

---

## Setup Wizard Steps

1. **Welcome** - Brief intro, "Start oppsett" button
2. **Location** - Lat/lng inputs, "Bruk Trondheim" preset
3. **Transport** - Entur stop IDs with live validation
4. **Electricity** - Tibber token, grid fee (optional, can skip)
5. **Calendar** - Google credentials (optional, can skip)
6. **Photos** - iCloud URL, interval (optional, can skip)
7. **Complete** - Summary, "Gå til dashboard" button

---

## Files to Create/Modify

### Backend (server/)
| File | Action | Purpose |
|------|--------|---------|
| `src/router.ts` | Create | Request routing utility |
| `src/middleware/auth.ts` | Create | Session validation |
| `src/middleware/rateLimit.ts` | Create | Brute force protection |
| `src/handlers/auth.ts` | Create | Auth endpoints |
| `src/handlers/config.ts` | Create | Config CRUD |
| `src/handlers/system.ts` | Create | Reset, health |
| `src/services/configStore.ts` | Create | File storage + encryption |
| `src/services/crypto.ts` | Create | AES-256-GCM utilities |
| `src/index.ts` | Modify | Add new routes |

### Frontend (src/)
| File | Action | Purpose |
|------|--------|---------|
| `main.tsx` | Modify | Add preact-router |
| `components/admin/AdminRouter.tsx` | Create | Route handler |
| `components/admin/AdminLayout.tsx` | Create | Mobile-first wrapper |
| `components/admin/LoginPage.tsx` | Create | PIN entry |
| `components/admin/SetupWizard.tsx` | Create | Multi-step setup |
| `components/admin/SettingsPage.tsx` | Create | Config management |
| `components/admin/ResetPage.tsx` | Create | Factory reset |
| `components/admin/RecoveryPage.tsx` | Create | PIN recovery |
| `services/validation.ts` | Create | API key validation |
| `hooks/useAuth.ts` | Create | Auth state management |
| `contexts/ConfigContext.tsx` | Modify | Fetch from server |

### Scripts
| File | Action | Purpose |
|------|--------|---------|
| `scripts/kiosk-admin` | Create | CLI for reset-pin |
| `scripts/setup-admin.sh` | Create | Install CLI tool |

### Dependencies
```bash
npm install preact-router  # Frontend routing
# No backend deps needed (using Node.js crypto)
```

---

## Security Measures

- **Rate limiting**: 5 failed login attempts → 5-minute lockout (exponential backoff)
- **Session cookies**: HttpOnly, SameSite=Strict, 7-day max age
- **Encryption at rest**: API keys encrypted with AES-256-GCM
- **Setup code**: 6 chars, 15-minute expiry, displayed on TV only
- **Recovery code**: 6 chars, 5-minute expiry, requires SSH access
- **CORS**: Credentials allowed only for same-origin

---

## Implementation Order

### Phase 1: Backend Auth & Config Storage
1. Create `configStore.ts` with encryption
2. Create `crypto.ts` utilities
3. Create auth handlers (setup, login, logout)
4. Create config handlers (get, update)
5. Add routes to `index.ts`
6. Test with curl

### Phase 2: Frontend Routing & Auth
1. Install preact-router
2. Create AdminRouter, AdminLayout
3. Create LoginPage with PIN input
4. Create useAuth hook
5. Test login flow

### Phase 3: Setup Wizard
1. Create SetupWizard with step state
2. Create each step component
3. Add setup code display to kiosk dashboard
4. Add validation service
5. Test first-time setup flow

### Phase 4: Settings & Reset
1. Create SettingsPage with collapsible sections
2. Adapt existing ConfigPanel form logic
3. Create ResetPage with confirmation
4. Test config updates propagate to kiosk

### Phase 5: Recovery & Polish
1. Create kiosk-admin CLI script
2. Create RecoveryPage
3. Update ConfigContext to fetch from server
4. Mobile responsive testing
5. Error handling polish

---

## Verification Plan

### Manual Testing
1. **First-time setup**: Clear config, verify setup screen on TV, complete wizard from phone
2. **Login flow**: Close browser, reopen, verify session persists
3. **Config update**: Change Tibber token, verify electricity widget updates
4. **Factory reset**: Trigger reset, verify returns to setup screen
5. **PIN recovery**: Run SSH command, verify recovery code works
6. **Rate limiting**: Enter wrong PIN 5 times, verify lockout
7. **Mobile UX**: Test all flows on iPhone Safari

### Automated Validation
```bash
# Backend health check
curl http://localhost:3001/api/health

# Auth status (should show needsSetup: true initially)
curl http://localhost:3001/api/auth/status

# After setup, test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"pin":"1234"}' \
  -c cookies.txt

# Test config fetch with session
curl http://localhost:3001/api/config/full -b cookies.txt
```
