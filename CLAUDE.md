# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Commands

### Development
- `npm run dev` - Start development server with hot-reload (port 3000)
- `npm run build` - Build for production (TypeScript compilation + Vite build)
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint on TypeScript/TSX files
- `npm run typecheck` - Run TypeScript type checking without emitting files

### Testing
- `npm test` - Run Puppeteer automated tests
- `npm run start-tests` - Start dev server and show test options menu
- `npm run test:manual` - Start dev server for manual testing
- `npm run run-puppeteer-test` - Run Puppeteer tests via shell script

### Deployment
- `npm run deploy` - Build and deploy to Raspberry Pi via rsync
  - Target: `pi@192.168.50.37:/var/www/kiosk/`
  - SSH key auth required (see README.md for setup)

## Tech Stack
- **Frontend:** Preact (via React alias) + TypeScript + Vite
- **Styling:** Tailwind CSS (utility-first, static CSS, no runtime)
- **State:** React Context API + localStorage
- **Testing:** Puppeteer for browser automation
- **Build:** Vite with Preact alias, path alias '@' -> 'src'
- **Target Device:** Raspberry Pi Zero W 2 (512MB RAM)
- **Bundle Size:** ~69 KB (13 KB CSS + 56 KB JS)

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
- `ConfigPanel` provides settings UI (custom sliding drawer from right side)
- Widget components receive `WidgetProps<T>` with config and onConfigChange callback
- `ThemeWrapper` applies theme via direct DOM manipulation (CSS variables on document root)
- App.tsx initializes default layout with welcome widget and creates clock widget on first load

### Build Configuration
- Preact alias in `vite.config.ts`: `'react' -> 'preact/compat'`, `'react-dom' -> 'preact/compat'`
- Tailwind CSS via PostCSS (`postcss.config.js`, `tailwind.config.js`)
- Path alias: `'@' -> 'src'`

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
   - Use Tailwind CSS classes for all styling (no CSS-in-JS)

3. **Register widget in `WidgetRegistration.tsx`:**
   - Call `registerWidgetType()` with WidgetMetadata
   - Provide defaultConfig matching your config interface
   - Reference your component in metadata.component

4. **Widget configs are type-safe:**
   - Each widget type has its own config interface (ClockWidgetConfig, WeatherWidgetConfig, etc.)
   - Widget-specific settings are nested (e.g., clockSettings, weatherSettings)
   - All widgets share BaseWidgetConfig properties (id, type, title, visible, position, appearance, refreshInterval)

## Code Style
- TypeScript for all new code, avoid `any` type
- camelCase for variables/functions, PascalCase for components/types
- Functional components with hooks (not class components)
- Tailwind CSS classes for all styling, no inline styles except for dynamic values
- Group imports: external -> internal -> styles
- Use Prettier for formatting (default config)

## Testing Notes
- Puppeteer tests run with `--no-sandbox` flag for Ubuntu 23.10+ compatibility
- Manual test pages available at `/tests/manual/`
- Screenshots saved to `/tests/screenshots/`
- See `/tests/README.md` for detailed testing documentation

## Development Workflow
1. Widget types must be registered before widget instances can be created
2. Widget instances link to layout positions via widget ID
3. Changes to widget configs automatically persist to localStorage
4. App.tsx handles initial layout setup and widget creation
5. Use the config panel button to modify settings at runtime

## Development Plan

### Epic 1: Project Foundation - COMPLETE
### Epic 2: Core Widget Development - IN PROGRESS
- Clock/Date Widget - Complete
- Weather Widget - Next
- Calendar Widget - Planned
### Epic 3: Media and Information Widgets - Planned
### Epic 4: Advanced Features - Planned
### Epic 5: UI/UX Refinement - Planned
### Epic 6: Deployment and Optimization - In Progress
