# Technology Stack Audit - Kiosk Application

**Date**: 2026-02-09
**Target Device**: Raspberry Pi Zero W 2 (1GHz quad-core ARM, 512MB RAM)
**Product Type**: 24/7 Always-On Information Display

---

## Executive Summary

### Current State
- **Production Build**: 474KB JS bundle (reasonable)
- **Dev Dependencies**: 251MB frontend + 16MB backend (typical but heavy for Pi Zero)
- **Runtime**: Chromium browser + Node.js backend + NGINX
- **Memory Profile**: Estimated 200-300MB+ for browser, 50-100MB for Node.js

### Critical Concerns
1. **⚠️ Pi Zero W 2 has only 512MB RAM** - Running Chromium + Node.js + OS leaves minimal headroom
2. **🔴 Backend currently disabled** - Logging system was completely shut down due to issues
3. **❓ Backend necessity unclear** - Most functionality could be client-side
4. **⚡ Heavy framework stack** - React + Chakra UI + Framer Motion for a static display

---

## Detailed Analysis

### 1. Frontend Framework: React + TypeScript

**Current Choice**: React 18 + TypeScript + Vite

#### Pros
✅ Developer experience and productivity
✅ Strong typing with TypeScript
✅ Fast HMR with Vite
✅ Large ecosystem and community
✅ Component reusability

#### Cons
❌ React overhead for a static display (virtual DOM, reconciliation)
❌ Runtime bundle size (even tree-shaken)
❌ Memory usage from React runtime
❌ Unnecessary complexity for mostly static content

#### Alternatives

**Option A: Vanilla TypeScript + Web Components**
- Pros: Minimal bundle, native browser APIs, no framework overhead
- Cons: More boilerplate, less developer ergonomics
- **Best for**: Maximum performance, minimal memory footprint
- **Bundle estimate**: 50-100KB (vs 474KB current)

**Option B: Preact**
- Pros: 3KB vs 40KB React, same API, drop-in replacement
- Cons: Smaller ecosystem, some library compatibility issues
- **Best for**: Keep React DX, reduce bundle size
- **Bundle estimate**: 350-400KB (15-20% reduction)

**Option C: Svelte/SvelteKit**
- Pros: Compiles to vanilla JS, no runtime, reactive by default
- Cons: Different paradigm, smaller ecosystem
- **Best for**: Optimal performance with good DX
- **Bundle estimate**: 100-200KB

**Option D: Solid.js**
- Pros: Fine-grained reactivity, no VDOM, excellent performance
- Cons: Smaller ecosystem, JSX but different mental model
- **Best for**: React-like DX with better performance
- **Bundle estimate**: 200-300KB

#### Recommendation
🎯 **Keep React for now, consider Preact for quick wins**
- React is working and you have momentum
- Preact alias in Vite config is 5-minute change
- Revisit if memory becomes critical

---

### 2. UI Library: Chakra UI + Framer Motion

**Current Choice**: Chakra UI 2.8 + Emotion + Framer Motion

#### Pros
✅ Rapid UI development
✅ Built-in theming
✅ Accessibility baked in
✅ Consistent design system

#### Cons
❌ Large bundle size (Emotion CSS-in-JS overhead)
❌ Framer Motion is heavy (~50KB) for simple animations
❌ Runtime style calculation overhead
❌ Overkill for a kiosk with limited UI

#### Analysis
- **Chakra UI**: Good choice for prototyping, heavy for production kiosk
- **Framer Motion**: Powerful but unnecessary for simple fade/slide transitions
- **CSS-in-JS**: Runtime overhead vs static CSS

#### Alternatives

**Option A: Tailwind CSS + CSS**
- Pros: No runtime, purged CSS is tiny, fast
- Cons: Lose component library, more manual work
- **Best for**: Production optimization, static styling

**Option B: Pico CSS / Water.css**
- Pros: Classless, minimal, beautiful defaults
- Cons: Less control, limited components
- **Best for**: Ultra-minimal approach

**Option C: DaisyUI (Tailwind components)**
- Pros: Component library with Tailwind, no JS overhead
- Cons: Still need to learn Tailwind

#### Recommendation
🎯 **Transition to Tailwind CSS gradually**
- Build new widgets with Tailwind
- Keep Chakra for existing components initially
- Remove Framer Motion, use CSS transitions
- Expected savings: 100-150KB bundle, better runtime performance

---

### 3. State Management: React Context API

**Current Choice**: Multiple Context providers with localStorage persistence

#### Pros
✅ No external dependencies
✅ Native to React
✅ Simple mental model
✅ Works well for small-medium apps

#### Cons
❌ Re-render performance issues with many contexts
❌ No built-in devtools
❌ Can get messy with complex state

#### Alternatives

**Option A: Zustand**
- Pros: Minimal (1KB), simple, good DevTools
- Cons: Another dependency
- **Best for**: Better performance, easier debugging

**Option B: Jotai/Nanostores**
- Pros: Atomic state, very lightweight
- Cons: Different paradigm

**Option C: Keep Context + Add Immer**
- Pros: Immutable updates easier
- Cons: Small additional dependency

#### Recommendation
🎯 **Keep Context API for now**
- It's working and not a bottleneck
- Optimize when you add more complex state (calendar, weather data)
- Consider Zustand if you notice re-render issues

---

### 4. Backend: Node.js + Express

**Current Choice**: Express.js with Winston logging (currently disabled)

#### Critical Issues
🔴 **Backend is functionally disabled** - All logging shut down due to flooding issues
🔴 **Unclear value proposition** - What does backend actually provide?
🔴 **Memory overhead** - 50-100MB Node.js process on 512MB device
🔴 **Additional complexity** - Another service to manage, monitor, update

#### Current Backend Functions
Looking at the server code:
- ❌ Logging endpoint (disabled due to issues)
- ❓ API proxying (not implemented yet)
- ❓ Data caching (not implemented yet)
- ❓ Calendar/Weather API keys (not implemented yet)

#### Analysis: Do You Need a Backend?

**Reasons TO have a backend:**
1. **API Key Security** - Hide Google Calendar, Weather API keys from client
2. **CORS Proxying** - Some APIs don't allow browser requests
3. **Data Caching** - Reduce API calls, faster loading
4. **Rate Limiting** - Prevent API quota exhaustion
5. **Data Aggregation** - Combine multiple API calls
6. **Configuration Management** - Store settings server-side

**Reasons NOT to have a backend:**
1. **Memory constraints** - Pi Zero W 2 has only 512MB RAM
2. **Complexity** - Another failure point, requires monitoring
3. **API keys can be read anyway** - Browser can inspect network traffic
4. **Most APIs support CORS** - Direct client calls possible
5. **Caching possible in browser** - Service Workers, Cache API
6. **Single-user device** - Not a multi-tenant system

#### Alternatives

**Option A: Serverless Functions** (Vercel/Netlify/Cloudflare Workers)
- Pros: No local overhead, global CDN, auto-scaling
- Cons: External dependency, cold starts, vendor lock-in
- **Cost**: Free tier sufficient for single kiosk

**Option B: Backend on Different Hardware**
- Pros: Free up Pi Zero RAM, better performance
- Cons: Additional hardware, network dependency
- **Best for**: If you have always-on server/NAS

**Option C: Pure Client-Side**
- Pros: No backend complexity, all RAM for browser
- Cons: API keys visible, no server-side caching
- **Best for**: Using only public APIs or OAuth

**Option D: Lightweight Backend (Deno/Bun)**
- Pros: Lower memory footprint than Node.js
- Cons: Still memory overhead, smaller ecosystem
- **Best for**: If backend is truly necessary

#### Recommendation
🎯 **Remove local backend, use Serverless or Client-Side**

**Immediate action:**
1. Evaluate if any planned features REQUIRE backend
2. If yes → Use Cloudflare Workers (free, fast, minimal config)
3. If no → Remove `server/` directory entirely
4. Free up 50-100MB RAM for browser performance

**For your use case:**
- **Calendar API** → OAuth in browser, API calls direct (Google supports CORS)
- **Weather API** → Use public API or proxy via Cloudflare Worker
- **Photos** → Local files or OAuth to Apple Photos
- **Transport** → Usually public APIs, CORS or Worker proxy

---

### 5. Database: SQLite/PostgreSQL

**Current Choice**: Mentioned in requirements, not implemented

#### Analysis
❓ **What needs to be stored?**
- Widget configurations → localStorage (already done)
- Layout settings → localStorage (already done)
- Theme preferences → localStorage (already done)
- API cache → localStorage/IndexedDB (browser native)

❓ **Server-side storage needs?**
- Historical data? (weather, transport logs)
- Multi-user settings? (No, single kiosk)
- Large datasets? (No, live API data)

#### Recommendation
🎯 **No database needed**
- Use localStorage for settings (already implemented)
- Use IndexedDB for larger data (if needed)
- Use Cache API for API response caching
- Databases add complexity without clear benefit for single-user kiosk

---

### 6. Testing: Puppeteer

**Current Choice**: Puppeteer for browser automation

#### Pros
✅ Full browser testing
✅ Screenshot capabilities
✅ Good for integration tests

#### Cons
❌ Heavy dependency (24.6.0 includes full Chromium)
❌ Slow test execution
❌ High memory usage

#### Alternatives

**Option A: Playwright**
- Pros: Modern, faster, better API
- Cons: Still heavy

**Option B: Vitest + Testing Library**
- Pros: Fast unit/component tests, less memory
- Cons: Not full E2E

**Option C: Manual Testing**
- Pros: No overhead for simple kiosk
- Cons: Less automated validation

#### Recommendation
🎯 **Add Vitest for component tests, keep Puppeteer for E2E**
- Unit test widget logic with Vitest (fast, lightweight)
- Keep Puppeteer for critical E2E flows only
- Run E2E tests on development machine, not Pi

---

### 7. Deployment: Raspberry Pi Zero W 2

**Current Choice**: Pi Zero W 2 (512MB RAM) + NGINX + Chromium Kiosk Mode

#### Critical Hardware Analysis

**Raspberry Pi Zero W 2 Specs:**
- CPU: 1GHz quad-core ARM Cortex-A53
- RAM: **512MB** (shared with GPU)
- This is a VERY constrained device

**Estimated Memory Usage:**
```
Raspberry Pi OS Lite:     ~100MB
Chromium (kiosk mode):    ~150-250MB
Node.js backend:          ~50-100MB
NGINX:                    ~10MB
-----------------------------------
Total:                    ~310-460MB
Available for apps:       ~50-200MB (tight!)
```

#### Memory Management Strategy

**Critical optimizations needed:**
1. Run Chromium with memory limits: `--memory-pressure-off --js-flags="--max-old-space-size=256"`
2. Disable Node.js backend to free 50-100MB
3. Use NGINX to serve static files only
4. Minimize background processes
5. Consider RAM disk for temporary files
6. Use zram compression for swap

#### Alternative Hardware

**Option A: Raspberry Pi 3/4/5**
- 1GB+ RAM, much more comfortable
- Better performance
- Higher power consumption
- **Recommendation**: Upgrade if budget allows (~$35-60)

**Option B: Raspberry Pi Zero 2 W** (same as current)
- Keep current hardware
- Optimize aggressively
- Accept performance limitations

**Option C: Old laptop/tablet**
- More RAM, better display
- Reuse existing hardware
- Less "clean" installation

#### Recommendation
🎯 **Optimize for Pi Zero W 2, but consider hardware upgrade**
- Pi Zero W 2 is borderline for this use case
- With optimizations (no backend, lightweight stack), it can work
- Pi 3B+ or 4 (1GB) would be more comfortable (~$35)
- Long-term: Consider Pi 5 (2GB) when budget allows

---

## Recommended Architecture Changes

### Immediate Optimizations (Low Effort, High Impact)

1. **Remove Backend** (saves 50-100MB RAM)
   - Move API proxying to Cloudflare Workers (free tier)
   - Use direct API calls where possible
   - localStorage for all configuration

2. **Replace Framer Motion with CSS** (saves ~50KB bundle)
   - Use CSS transitions for animations
   - Simple fade/slide effects

3. **Add Preact Alias** (saves ~50-100KB bundle)
   ```js
   // vite.config.ts
   alias: {
     'react': 'preact/compat',
     'react-dom': 'preact/compat'
   }
   ```

4. **Optimize Chromium Flags**
   ```bash
   chromium-browser --kiosk \
     --memory-pressure-off \
     --js-flags="--max-old-space-size=256" \
     --disable-gpu \
     --disable-software-rasterizer \
     http://localhost
   ```

### Medium-Term Refactoring (Planned over 2-4 weeks)

5. **Migrate to Tailwind CSS**
   - Remove Chakra UI dependency
   - Static CSS, no runtime overhead
   - Expected savings: 100-150KB bundle

6. **Add Service Worker for Caching**
   - Cache API responses (weather, calendar)
   - Offline functionality
   - Reduce network requests

7. **Lazy Load Widgets**
   - Only load clock initially
   - Lazy load weather/calendar/photo widgets
   - Faster initial page load

### Long-Term Architectural Improvements

8. **Consider Svelte Rewrite** (if performance issues persist)
   - No virtual DOM overhead
   - Smaller bundle size
   - Better performance on constrained hardware

9. **Evaluate Hardware Upgrade**
   - Pi 3B+ or Pi 4 (1GB RAM) for comfort
   - Better long-term stability

---

## Revised Architecture Proposal

### Minimal Backend Architecture

```
┌─────────────────────────────────────┐
│    Raspberry Pi Zero W 2 (512MB)   │
├─────────────────────────────────────┤
│  NGINX (serve static files only)   │ ~10MB
│  Chromium (kiosk mode)              │ ~200MB
├─────────────────────────────────────┤
│  No local backend ✅                │
└─────────────────────────────────────┘
         │
         ↓ (API calls)
┌─────────────────────────────────────┐
│  Cloudflare Workers (free tier)     │
│  - Weather API proxy                │
│  - Calendar API proxy (if needed)   │
│  - API key protection               │
│  - Rate limiting                    │
└─────────────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  External APIs                      │
│  - Google Calendar                  │
│  - Apple Weather / OpenWeather      │
│  - Transit APIs                     │
└─────────────────────────────────────┘
```

### Benefits
✅ 50-100MB more RAM for browser
✅ Fewer failure points
✅ Simpler deployment
✅ Better performance
✅ Free API proxying (Cloudflare Workers)

---

## Technology Stack Scorecard

| Component | Current | Grade | Recommendation |
|-----------|---------|-------|----------------|
| **Frontend Framework** | React 18 | B+ | Keep (or try Preact alias) |
| **UI Library** | Chakra UI | C | Migrate to Tailwind CSS |
| **Animation** | Framer Motion | D | Replace with CSS |
| **State** | Context API | B | Keep |
| **Backend** | Express (disabled) | F | **Remove entirely** |
| **Database** | None | A | Keep as-is |
| **Build Tool** | Vite | A | Keep |
| **Testing** | Puppeteer only | C | Add Vitest |
| **Hardware** | Pi Zero W 2 | C | Works but tight |
| **Overall** | - | C+ | Needs optimization |

---

## Action Plan

### Phase 1: Critical Fixes (This Week)
- [ ] Remove Express backend, free up RAM
- [ ] Set up Cloudflare Workers for API proxying
- [ ] Optimize Chromium launch flags
- [ ] Add Preact alias to Vite config

**Expected Impact**: +50-100MB RAM, -100KB bundle

### Phase 2: UI Optimization (Next 2 Weeks)
- [ ] Remove Framer Motion
- [ ] Migrate to Tailwind CSS (gradual)
- [ ] Implement CSS-based animations

**Expected Impact**: -150KB bundle, better runtime performance

### Phase 3: Advanced Optimization (Next Month)
- [ ] Add Service Worker for caching
- [ ] Implement lazy loading for widgets
- [ ] Add Vitest for component testing
- [ ] Evaluate hardware upgrade path

**Expected Impact**: Faster loads, offline support, better DX

---

## Conclusion

Your current tech stack is **functional but over-engineered** for a single-user kiosk on constrained hardware.

### Key Findings:
1. **Backend is unnecessary** - Adds 50-100MB overhead with no clear value
2. **UI library is heavy** - Chakra UI + Framer Motion are production overkill
3. **Hardware is borderline** - Pi Zero W 2 works but is tight
4. **Framework choice is OK** - React works, but lighter alternatives exist

### Priority Actions:
1. 🔴 **Remove Express backend immediately** - biggest RAM savings
2. 🟡 **Plan Tailwind migration** - gradual improvement
3. 🟢 **Consider hardware upgrade** - long-term comfort

With these optimizations, your kiosk will be more stable, performant, and maintainable on the Pi Zero W 2.
