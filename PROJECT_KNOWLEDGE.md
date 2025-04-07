# Kiosk Application Project Knowledge

This document captures important knowledge and decisions made during development that may not be documented elsewhere.

## Architectural Decisions

### State Management Approach
- Using **React Context API** for global state management
- Implemented a **multi-context approach** with specialized contexts:
  - `LayoutContext`: Manages grid layout configuration
  - `ThemeContext`: Handles theming, dark/light mode, and accessibility settings
  - `WidgetRegistryContext`: Manages widget types and instances
  - `AppSettingsContext`: Handles application-wide settings
- The contexts are composed with proper dependency management in `AppContextProvider`

### Storage Strategy
- **Versioned storage mechanism** to support schema evolution
- **Hybrid storage approach**:
  - `localStorage` for small, frequently accessed data
  - `IndexedDB` for larger datasets (like widget data with images)
- Implemented migration system for handling schema changes
- Added TTL (time-to-live) support for cached widget data
- Support for data import/export

### Widget System
- Implemented a **registry pattern** for widget management
- Used **discriminated unions** for type-safe widget configurations
- Widget capabilities system to define what each widget can do
- Centralized widget instance management

### Layout System
- Grid-based responsive layout using CSS Grid
- Support for flexible widget positioning and sizing
- Configuration-driven layout system

## Testing Approach
- Manual testing via dedicated test pages
- Structured test plan with specific test cases for each feature
- Integrated browser developer tools for storage inspection
- Encountered issues with Puppeteer sandbox that limited automated testing

## Known Limitations
- Puppeteer testing requires sandbox workarounds on certain Linux distributions
- Current implementation focuses on client-side storage without backend persistence
- Offline support is limited to cached data

## Development Tips
- Use the browser's Application tab to inspect localStorage and IndexedDB data
- Clear localStorage and IndexedDB when testing storage migrations or experiencing unexpected behavior
- Test widget functionality across different screen sizes

## Future Enhancement Ideas
- Consider adding a service worker for improved offline support
- Implement server-side storage sync for multi-device support
- Add telemetry for monitoring widget performance and usage patterns
- Support for widget-specific themes that override global theme settings

## Technical Debt
- Some components may need refactoring as widget system expands
- Additional error boundary components would improve resilience
- Improve test coverage with automated tests when Puppeteer issues are resolved