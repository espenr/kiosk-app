# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with hot-reload (port 3000)
- `npm run build` - Build for production (runs TypeScript compilation + Vite build)
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint on TypeScript/TSX files
- `npm run typecheck` - Run TypeScript type checking without emitting files

### Testing
- `npm test` - Run Puppeteer automated tests
- `npm run start-tests` - Start dev server and show test options menu
- `npm run test:manual` - Start dev server for manual testing
- `npm run run-puppeteer-test` - Run Puppeteer tests via shell script

### Backend Server
- `npm run server` - Start backend server (requires initial setup)
- `npm run server:install` - Install backend dependencies
- `npm run dev:all` - Run both frontend and backend concurrently

### Deployment
- `npm run deploy` - Build and deploy to Raspberry Pi test server via rsync
  - Target: `pi@raspberrypizerow2.local:/var/www/kiosk/`
  - Hostname: raspberrypizerow2
  - IP: 192.168.50.37

## Architecture

### Widget System
The application uses a registry-based widget system with three core contexts:

1. **WidgetRegistryContext** (`src/contexts/WidgetRegistryContext.tsx`)
   - Manages widget type registration and widget instances
   - Provides `registerWidgetType()` to register new widget types with metadata
   - Provides `createWidget()`, `updateWidget()`, `deleteWidget()`, `getWidget()` for instance management
   - Widget instances map widget IDs to their config, metadata, capabilities, and state
   - Persists widget configurations to localStorage via `STORAGE_KEYS.WIDGETS`

2. **LayoutContext** (`src/contexts/LayoutContext.tsx`)
   - Manages grid-based layout (12x12 grid by default)
   - Stores widget positions via `WidgetPosition` (id, x, y, width, height, visible)
   - Persists layout to localStorage via `STORAGE_KEYS.LAYOUT_CONFIG`

3. **Widget Registration Flow**
   - Widget types must be registered in `WidgetRegistration.tsx` component
   - Each widget type requires: `WidgetMetadata` with type, name, description, defaultConfig, component
   - Widget configs extend `BaseWidgetConfig` and include widget-specific settings
   - Widgets are rendered by React.createElement() using metadata.component

### State Management
- React Context API for global state (widgets, layout, theme, app settings)
- All contexts wrapped in `AppContextProvider` (`src/contexts/AppContextProvider.tsx`)
- LocalStorage persistence for:
  - Layout configuration (`STORAGE_KEYS.LAYOUT_CONFIG`)
  - Widget configurations (`STORAGE_KEYS.WIDGETS`)
  - Theme settings (`STORAGE_KEYS.THEME_CONFIG`)
  - App settings (`STORAGE_KEYS.APP_SETTINGS`)

### Component Structure
- `Grid` and `GridItem` components handle grid-based layout rendering
- `ConfigPanel` provides settings UI (drawer from right side)
- Widget components receive `WidgetProps<T>` with config and onConfigChange callback
- App.tsx initializes default layout with welcome widget and creates clock widget on first load

### Backend Server
- Express.js server in `server/` directory
- Winston-based logging with daily rotation (`server/src/services/logger.js`)
- REST endpoint for client-side error logging (`server/src/routes/logging.js`)
- Error handling middleware (`server/src/middleware/errorHandler.js`)
- CORS and Helmet middleware for security

## Widget Development

### Creating a New Widget

1. **Add widget type to `src/types/widget.ts`:**
   - Add type to `WidgetType` union (e.g., `'mywidget'`)
   - Create `MyWidgetConfig` interface extending `BaseWidgetConfig`
   - Add to `WidgetConfig` union type

2. **Create widget component:**
   - Place in `src/components/widgets/mywidget/MyWidget.tsx`
   - Component receives `WidgetProps<MyWidgetConfig>`
   - Use `config` prop for settings, call `onConfigChange` to update

3. **Register widget in `WidgetRegistration.tsx`:**
   - Call `registerWidgetType()` with WidgetMetadata
   - Provide defaultConfig matching your config interface
   - Reference your component in metadata.component

4. **Widget configs are type-safe:**
   - Each widget type has its own config interface (ClockWidgetConfig, WeatherWidgetConfig, etc.)
   - Widget-specific settings are nested (e.g., clockSettings, weatherSettings)
   - All widgets share BaseWidgetConfig properties (id, type, title, visible, position, appearance, refreshInterval)

## Tech Stack
- **Frontend:** Preact (via React alias) + TypeScript + Vite
- **UI Library:** Chakra UI (CSS-in-JS with theming)
- **State:** React Context API
- **Backend:** None (removed for memory optimization)
- **Testing:** Puppeteer for browser automation
- **Build:** Vite with Preact alias, path alias '@' → 'src'
- **Target Device:** Raspberry Pi Zero W 2 (512MB RAM)
- **Bundle Size:** 392KB JS (130KB gzipped)

## Code Style
- TypeScript for all new code, avoid `any` type
- camelCase for variables/functions, PascalCase for components/types
- Functional components with hooks (not class components)
- Group imports: external → internal → styles
- Use Prettier for formatting (default config)

## Testing Notes
- Puppeteer tests run with `--no-sandbox` flag for Ubuntu 23.10+ compatibility
- Manual test pages available at `/tests/manual/`
- Screenshots saved to `/tests/screenshots/`
- See `/tests/README.md` for detailed testing documentation

## Recent Optimizations (2026-02-09)

**Backend Removal & Preact Migration:**
- ✅ Removed Express backend (saves 50-100MB RAM)
- ✅ Added Preact alias (saves 81KB bundle, 17% reduction)
- ✅ Simplified logger to console-only
- ✅ Re-enabled React.StrictMode
- ✅ Cleaned up unused imports

**Results:**
- Bundle: 474KB → 392KB (81KB saved)
- Packages: 501 → 440 (61 removed)
- RAM freed: ~100MB on Pi Zero W 2
- No functionality lost

**See:**
- `/docs/OPTIMIZATION_RESULTS.md` - Detailed results
- `/docs/TECH_STACK_AUDIT.md` - Full technology audit
- `/docs/DEPLOYMENT_GUIDE.md` - Deployment with optimized Chromium flags

## Development Workflow
1. Widget types must be registered before widget instances can be created
2. Widget instances link to layout positions via widget ID
3. Changes to widget configs automatically persist to localStorage
4. App.tsx handles initial layout setup and widget creation
5. Use the config panel (⚙️ button) to modify settings at runtime

## Development Plan & Task Status

### Epic 1: Project Foundation ✅ COMPLETED
- [x] Task 1.1: Project setup and configuration
- [x] Task 1.2: Development Environment Setup
- [x] Task 1.3: Core layout system
- [x] Task 1.4: State management foundation

### Epic 2: Core Widget Development 🚧 IN PROGRESS
- [x] Task 2.1: Clock/Date Widget ✅
  - [x] Create basic digital clock display
  - [x] Add date display with formatting options
  - [x] Implement timezone support
  - [x] Add configuration options (12/24h, display format)
- [ ] Task 2.2: Weather Widget
  - [ ] Create weather display component
  - [ ] Implement Apple Weather API integration
  - [ ] Add current conditions display
  - [ ] Add forecast display
  - [ ] Create weather settings configuration
- [ ] Task 2.3: Calendar Widget
  - [ ] Create calendar view component
  - [ ] Implement Google Calendar API integration
  - [ ] Add event display functionality
  - [ ] Create calendar configuration options
  - [ ] Add color-coding for different calendars

### Epic 3: Media and Information Widgets
- [ ] Task 3.1: Photo Display
- [ ] Task 3.2: Public Transport Widget

### Epic 4: Advanced Features
- [ ] Task 4.1: Block Scheduling
- [ ] Task 4.2: System Features (offline detection, auto-refresh, error handling)

### Epic 5: UI/UX Refinement
- [ ] Task 5.1: User Interface Improvements
- [ ] Task 5.2: Accessibility Features

### Epic 6: Deployment and Optimization
- [ ] Task 6.1: Performance Optimization
- [ ] Task 6.2: Deployment Configuration
