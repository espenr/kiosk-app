# Kiosk App Redesign - Implementation Plan

## Summary
Rebuild the kiosk app from a flexible widget system to a **fixed-layout portrait dashboard** for a 32" TV, integrating with Google Calendar, Tibber, Entur, and iCloud Shared Album.

---

## Target Layout (Portrait 1080×1920)

```
┌──────────────────────────────────────────┐
│  HEADER (10%)                            │
│  [HH:MM:SS] [Date]    [Temp] [Forecast]  │
├──────────────────────────────────────────┤
│                                          │
│  PHOTO SLIDESHOW (40%)                   │
│  iCloud Shared Album                     │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ WEEK CALENDAR (overlay, z-index:2) │  │
│  │ Mon | Tue | Wed | Thu | Fri | Sat | Sun │
│  └────────────────────────────────────┘  │
├──────────────────────────────────────────┤
│  ELECTRICITY (25%)                       │
│  Current: X.XX kr/kWh  │  24h forecast   │
├──────────────────────────────────────────┤
│  TRANSPORT (15%)                         │
│  Next bus from Vikhammeråsen: HH:MM      │
└──────────────────────────────────────────┘
```

---

## New File Structure

```
src/
├── App.tsx                      # Fixed layout container
├── main.tsx                     # Simplified entry point
├── index.css                    # Portrait orientation styles
│
├── components/
│   ├── sections/                # Fixed sections (NOT widgets)
│   │   ├── Header/
│   │   │   ├── Header.tsx
│   │   │   ├── Clock.tsx
│   │   │   ├── DateDisplay.tsx
│   │   │   └── WeatherBar.tsx
│   │   ├── PhotoSlideshow/
│   │   │   ├── PhotoSlideshow.tsx
│   │   │   └── CalendarOverlay.tsx
│   │   ├── Calendar/
│   │   │   ├── WeekCalendar.tsx
│   │   │   └── DayColumn.tsx
│   │   ├── Electricity/
│   │   │   ├── Electricity.tsx
│   │   │   └── PriceChart.tsx
│   │   └── Transport/
│   │       └── Transport.tsx
│   └── settings/
│       └── SettingsPanel.tsx    # Minimal: API keys, stop ID
│
├── services/
│   ├── weather.ts               # Met.no API (free, no key)
│   ├── calendar.ts              # Google Calendar API
│   ├── photos.ts                # iCloud Shared Album scraper
│   ├── tibber.ts                # Tibber GraphQL API
│   └── entur.ts                 # Entur Journey Planner API
│
├── hooks/
│   ├── useWeather.ts
│   ├── useCalendar.ts
│   ├── usePhotos.ts
│   ├── useElectricity.ts
│   └── useTransport.ts
│
├── contexts/
│   └── ConfigContext.tsx        # Single context (replaces 4)
│
├── types/
│   └── index.ts                 # All types in one file
│
└── utils/
    ├── storage.ts               # KEEP (versioned localStorage)
    ├── norwegian.ts             # Date/number formatting
    └── api.ts                   # Fetch helpers with caching
```

---

## Files to Delete

| File | Reason |
|------|--------|
| `src/contexts/WidgetRegistryContext.tsx` | Over-abstraction for 1 widget |
| `src/contexts/LayoutContext.tsx` | Dynamic grid not needed |
| `src/contexts/AppSettingsContext.tsx` | Too many settings |
| `src/components/layout/Grid.tsx` | Replaced by fixed CSS |
| `src/components/layout/GridItem.tsx` | Replaced by fixed CSS |
| `src/components/widgets/` (entire folder) | Replaced by sections |
| `src/types/widget.ts` | Replaced by simpler types |

---

## Files to Keep/Modify

| File | Action |
|------|--------|
| `src/utils/storage.ts` | **Keep** - solid localStorage utility |
| `src/contexts/ThemeContext.tsx` | **Simplify** - keep dark mode only |
| `vite.config.ts` | **Keep** - Preact alias works |
| `tailwind.config.js` | **Extend** - add portrait heights |

---

## API Integrations

### 1. Weather (Met.no)
- **Endpoint:** `https://api.met.no/weatherapi/locationforecast/2.0/compact`
- **Auth:** None (free Norwegian government API)
- **Refresh:** Every 30 minutes
- **Data:** Current temp + 5-day forecast

### 2. Tibber Electricity
- **Endpoint:** `https://api.tibber.com/v1-beta/gql` (GraphQL)
- **Auth:** Bearer token from Tibber account
- **Refresh:** Every 5 minutes
- **Data:** Current price + 24h prices

### 3. Entur Transport
- **Endpoint:** `https://api.entur.io/journey-planner/v3/graphql`
- **Auth:** None (requires `ET-Client-Name` header)
- **Refresh:** Every 1 minute
- **Data:** Next departures from Vikhammeråsen

### 4. Google Calendar
- **Auth:** OAuth 2.0 (pre-authenticate, store refresh token)
- **Refresh:** Every 15 minutes
- **Data:** Week's events

### 5. iCloud Shared Album
- **Method:** Scrape public shared album URL
- **Refresh:** Every hour
- **Data:** Photo URLs for slideshow

---

## Minimal Settings (ConfigContext)

```typescript
interface KioskConfig {
  location: {
    latitude: number;
    longitude: number;
    stopPlaceId: string;  // Entur stop ID
  };
  apiKeys: {
    tibber: string;
  };
  photos: {
    sharedAlbumUrl: string;
    interval: number;  // seconds between slides
  };
  calendar: {
    refreshToken?: string;
    calendarId?: string;
  };
}
```

---

## Implementation Phases

### Phase 0: Documentation Setup ✓
1. Create `/docs/plans/` directory
2. Move this plan to `/docs/plans/kiosk-redesign.md`
3. Update `CLAUDE.md` to reference the plan location

### Phase 1: Cleanup & Fixed Layout
1. Delete widget system files (contexts, components)
2. Create `DashboardLayout.tsx` with CSS Grid
3. Create placeholder section components
4. Single `ConfigContext` replacing 4 providers

### Phase 2: Header Section
1. Extract clock logic from existing `ClockDisplay.tsx`
2. Norwegian date formatting ("Mandag 9. februar")
3. Implement `useWeather` hook with Met.no API
4. Temperature + 5-day forecast bar

### Phase 3: Transport Section
1. Implement `useTransport` hook with Entur API
2. Find Vikhammeråsen stop ID
3. Display next 3 departures

### Phase 4: Electricity Section
1. Implement `useTibber` hook with GraphQL
2. Current price display (kr/kWh)
3. 24-hour price chart (simple bar chart)

### Phase 5: Calendar Section
1. Google Calendar OAuth flow (one-time setup)
2. Implement `useCalendar` hook
3. 7-day week view with events
4. Semi-transparent overlay on photos

### Phase 6: Photo Slideshow
1. iCloud Shared Album URL parser
2. Implement `usePhotos` hook
3. Crossfade slideshow with configurable interval

### Phase 7: Settings & Polish
1. Minimal settings panel (API keys, album URL)
2. Error states and offline handling
3. Performance optimization for Pi Zero

---

## Critical Implementation Details

### Portrait CSS Grid
```css
.dashboard {
  display: grid;
  grid-template-rows: 10% 50% 25% 15%;
  height: 100vh;
  width: 100vw;
}
```

### Calendar Overlay (z-index)
```tsx
<div className="relative h-[50%]">
  <PhotoSlideshow className="absolute inset-0 z-10" />
  <WeekCalendar className="absolute bottom-0 inset-x-0 h-2/5 z-20 bg-black/70" />
</div>
```

### Norwegian Formatting
```typescript
// "Mandag 9. februar"
new Intl.DateTimeFormat('nb-NO', {
  weekday: 'long',
  day: 'numeric',
  month: 'long'
}).format(date);
```

---

## Verification

After implementation, verify:

1. **Layout:** Dashboard displays correctly in portrait orientation
2. **Clock:** Time updates every second, Norwegian date format
3. **Weather:** Current temperature and 5-day forecast from Met.no
4. **Photos:** Slideshow cycles through iCloud album images
5. **Calendar:** Week events display, overlay is semi-transparent
6. **Electricity:** Current price shows, chart renders 24h data
7. **Transport:** Next departures show, refresh every minute
8. **Settings:** Can configure Tibber token and album URL
9. **Pi Zero:** Bundle stays under 100KB, runs smoothly

**Test commands:**
```bash
npm run dev          # Local development
npm run build        # Production build
npm run deploy       # Deploy to Pi
```
