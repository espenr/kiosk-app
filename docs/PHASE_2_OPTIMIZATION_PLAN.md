# Phase 2 Optimization Plan

**Goal**: Further optimize bundle size, runtime performance, and add offline capabilities

**Expected Savings**: 150KB+ bundle, better runtime performance, offline support

---

## Overview of Changes

| Optimization | Complexity | Impact | Estimated Savings |
|-------------|------------|--------|------------------|
| 1. Remove Framer Motion | Low | Medium | ~50KB bundle |
| 2. Migrate to Tailwind CSS | High | High | ~100-150KB bundle + runtime |
| 3. Lazy Load Widgets | Medium | Medium | Faster initial load |
| 4. Add Service Worker | Medium | High | Offline support |

---

## 1. Remove Framer Motion

### Current Usage
Framer Motion is imported via Chakra UI but not heavily used in the app.

### Changes Required
- Remove `framer-motion` from dependencies
- Replace any motion components with CSS transitions
- Update Chakra UI configuration to disable motion

### Files to Update
```
package.json                          - Remove framer-motion
src/components/theme/ThemeWrapper.tsx - Disable motion in theme config
```

### CSS Transitions to Add
```css
/* Fade in/out */
.fade-enter { opacity: 0; }
.fade-enter-active { opacity: 1; transition: opacity 300ms; }
.fade-exit { opacity: 1; }
.fade-exit-active { opacity: 0; transition: opacity 300ms; }

/* Slide in/out */
.slide-enter { transform: translateX(100%); }
.slide-enter-active { transform: translateX(0); transition: transform 300ms; }
```

### Testing
- Verify config panel animations still work
- Check widget transitions
- Ensure no visual regressions

**Estimated Time**: 30 minutes
**Risk**: Low

---

## 2. Migrate to Tailwind CSS

### Strategy: Gradual Migration

**Phase 2a: Setup Tailwind** (30 min)
1. Install Tailwind CSS + PostCSS
2. Configure `tailwind.config.js`
3. Create `src/index.css` with Tailwind directives
4. Keep Chakra UI alongside Tailwind initially

**Phase 2b: Migrate Components** (2-4 hours)
Migrate in this order:
1. ✅ Simple components first: `Grid`, `GridItem`
2. ✅ Widget components: `ClockWidget`, `ClockDisplay`
3. ✅ Settings components: `ConfigPanel`
4. ✅ App component last

**Phase 2c: Remove Chakra UI** (30 min)
1. Remove Chakra UI dependencies
2. Remove emotion dependencies
3. Clean up theme provider
4. Final build test

### Tailwind Configuration

```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Match your kiosk theme
        primary: '#3182ce',
        secondary: '#805ad5',
      },
    },
  },
  plugins: [],
}
```

### Component Migration Example

**Before (Chakra UI):**
```tsx
<Box
  p={4}
  bg="gray.800"
  borderRadius="md"
  boxShadow="lg"
>
  <Heading size="lg" mb={4}>Title</Heading>
  <Text color="gray.300">Content</Text>
</Box>
```

**After (Tailwind):**
```tsx
<div className="p-4 bg-gray-800 rounded-md shadow-lg">
  <h2 className="text-2xl font-bold mb-4">Title</h2>
  <p className="text-gray-300">Content</p>
</div>
```

### Benefits
- ✅ No runtime CSS-in-JS overhead
- ✅ Smaller bundle (Tailwind purges unused styles)
- ✅ Better performance (static CSS)
- ✅ More control over styles

### Challenges
- ❌ Lose Chakra UI component library
- ❌ Need to rebuild some UI components
- ❌ More verbose className strings

**Estimated Time**: 3-5 hours total
**Risk**: Medium (most time-consuming change)

---

## 3. Lazy Load Widgets

### Current Situation
All widgets load immediately, even if not visible.

### Implementation

**3a: Dynamic Imports**
```tsx
// Before
import ClockWidget from './components/widgets/clock/ClockWidget';

// After
const ClockWidget = lazy(() => import('./components/widgets/clock/ClockWidget'));
```

**3b: Suspense Boundaries**
```tsx
<Suspense fallback={<WidgetLoadingSpinner />}>
  <ClockWidget config={config} />
</Suspense>
```

**3c: Update Widget Registry**
```tsx
// src/contexts/WidgetRegistryContext.tsx
interface WidgetMetadata {
  type: WidgetType;
  name: string;
  description: string;
  defaultConfig: Omit<WidgetConfig, 'id'>;
  component: React.LazyExoticComponent<React.ComponentType<WidgetProps>>; // Lazy!
  icon?: ReactNode;
}
```

### Files to Update
```
src/contexts/WidgetRegistryContext.tsx  - Support lazy components
src/components/widgets/WidgetRegistration.tsx - Use dynamic imports
src/App.tsx - Add Suspense boundaries
src/components/WidgetLoadingSpinner.tsx - Create loading component
```

### Benefits
- ✅ Faster initial page load
- ✅ Load widgets on-demand
- ✅ Smaller initial bundle
- ✅ Better code splitting

### Code Splitting Result
```
Before:
  index.js         392KB

After:
  index.js         250KB (core app)
  clock.chunk.js   30KB  (lazy)
  weather.chunk.js 40KB  (lazy)
  calendar.chunk.js 50KB (lazy)
```

**Estimated Time**: 1-2 hours
**Risk**: Low-Medium

---

## 4. Add Service Worker

### Purpose
- Cache API responses (weather, calendar, transit)
- Offline fallback support
- Background sync for updates

### Implementation

**4a: Install Workbox**
```bash
npm install -D workbox-cli workbox-build
```

**4b: Create Service Worker**
```js
// public/sw.js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpiringPlugin } from 'workbox-expiration';

// Precache app shell
precacheAndRoute(self.__WB_MANIFEST);

// Cache API responses
registerRoute(
  ({ url }) => url.origin === 'https://api.weather.gov',
  new NetworkFirst({
    cacheName: 'weather-api',
    plugins: [
      new ExpiringPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60, // 1 hour
      }),
    ],
  })
);

// Cache Google Calendar API
registerRoute(
  ({ url }) => url.origin === 'https://www.googleapis.com',
  new NetworkFirst({
    cacheName: 'calendar-api',
    plugins: [
      new ExpiringPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
);

// Fallback for offline
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html');
      })
    );
  }
});
```

**4c: Register Service Worker**
```tsx
// src/main.tsx
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered:', registration);
      })
      .catch(error => {
        console.log('SW registration failed:', error);
      });
  });
}
```

**4d: Update Vite Config**
```ts
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      manifest: {
        name: 'Kiosk App',
        short_name: 'Kiosk',
        description: 'Information display kiosk',
        theme_color: '#000000',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
```

### Files to Update/Create
```
package.json                  - Add vite-plugin-pwa
vite.config.ts               - Configure PWA plugin
public/sw.js                 - Service worker implementation
public/offline.html          - Offline fallback page
src/main.tsx                 - Register service worker
public/manifest.json         - PWA manifest
public/icon-192.png          - App icon 192x192
public/icon-512.png          - App icon 512x512
```

### Benefits
- ✅ Offline functionality
- ✅ Faster repeat visits (cached assets)
- ✅ Reduced API calls (cached responses)
- ✅ Progressive Web App capabilities

### Testing
- Test offline mode (disconnect network)
- Verify API caching works
- Check cache invalidation
- Test on actual Pi Zero W 2

**Estimated Time**: 2-3 hours
**Risk**: Medium

---

## Implementation Order

### Option A: Sequential (Safer, 6-10 hours total)
1. Remove Framer Motion (30 min)
2. Migrate to Tailwind CSS (3-5 hours)
3. Lazy Load Widgets (1-2 hours)
4. Add Service Worker (2-3 hours)

**Pros**: Test each change thoroughly before moving on
**Cons**: Slower overall

### Option B: Parallel (Faster, 4-6 hours total)
- Do #1 and #3 together (independent)
- Do #2 separately (major change)
- Do #4 last (depends on stability)

**Pros**: Faster completion
**Cons**: Harder to debug if issues arise

### Option C: Hybrid (Recommended) - SELECTED ✅

1. **Session 1** ✅ **COMPLETE** (~1 hour): Remove Framer Motion + Setup Tailwind
   - Results: Removed backend (50-100MB RAM), added Preact alias, setup Tailwind
   - Bundle: 392KB → still 392KB (Chakra UI still present)
   - See: `docs/SESSION_1_RESULTS.md`

2. **Session 2** ✅ **COMPLETE** (~2 hours): Migrate components to Tailwind
   - Results: Complete Chakra UI → Tailwind CSS migration
   - Bundle: 392KB → 68.68KB (82.5% reduction!)
   - Removed: 59 packages including @chakra-ui/react, @emotion/*
   - See: `docs/SESSION_2_RESULTS.md`

3. **Session 3** (1-2 hours): Lazy loading + final Tailwind cleanup
   - TODO: Implement dynamic imports for widgets
   - TODO: Re-enable Tailwind preflight
   - Expected: 20-30% additional bundle reduction

4. **Session 4** (2-3 hours): Service Worker + testing
   - DEFERRED: User indicated offline support not critical priority
   - Can be implemented later if needed

**Pros**: Balanced, manageable chunks
**Cons**: Requires 4 work sessions

**Status**: Sessions 1 & 2 complete with exceptional results!

---

## Expected Final Results

### Bundle Size (UPDATED WITH ACTUAL RESULTS)
```
Before Session 1:  392KB
After Session 2:   68.68KB (CSS: 13.07KB + JS: 55.61KB)
Target was:        200-250KB
Actual savings:    323.32KB (82.5% reduction!)
Status:            🎉 FAR EXCEEDED TARGET
```

### Performance
- ✅ Faster initial load (lazy loading)
- ✅ Better runtime performance (no CSS-in-JS)
- ✅ Offline support (service worker)
- ✅ Reduced memory usage (lighter framework)

### Memory on Pi Zero W 2
```
Current:  ~310MB used, ~200MB free
Target:   ~280MB used, ~230MB free
Savings:  ~30MB additional RAM
```

---

## Rollback Plan

If any optimization causes issues:

1. **Framer Motion**: Re-add dependency, revert theme config
2. **Tailwind CSS**: Revert to Chakra UI (keep both during transition)
3. **Lazy Loading**: Remove lazy() calls, use direct imports
4. **Service Worker**: Unregister SW, remove PWA plugin

Git branches recommended:
- `feat/remove-framer-motion`
- `feat/tailwind-migration`
- `feat/lazy-loading`
- `feat/service-worker`

---

## Testing Checklist

After each optimization:
- [ ] `npm run build` succeeds
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] App loads in browser
- [ ] Clock widget displays correctly
- [ ] Config panel opens and works
- [ ] Theme toggle works
- [ ] Layout grid functions properly
- [ ] No console errors
- [ ] Bundle size reduced as expected

Final integration test on Pi Zero W 2:
- [ ] Deploy to Pi
- [ ] App loads within 3 seconds
- [ ] Memory usage under 300MB
- [ ] No crashes after 10 minutes
- [ ] Offline mode works (disconnect WiFi)
- [ ] API caching works

---

## Questions Before Starting

1. **Preferred approach?** Sequential, Parallel, or Hybrid?
2. **Keep Chakra UI initially?** During Tailwind migration for safety?
3. **Service Worker priority?** Critical or can wait?
4. **Testing on Pi Zero W 2?** Can you test after each phase?

Let me know your preference and I'll proceed!
