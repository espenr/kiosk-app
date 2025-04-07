# CLAUDE.md - Kiosk Application Development Guide

## Build & Test Commands
- Build: `npm run build`
- Development: `npm run dev`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- Test (all): `npm test`
- Test (single): `npm test -- -t "test name"`

## Code Style Guidelines
- **Formatting**: Use Prettier with default configuration
- **Naming**: camelCase for variables/functions, PascalCase for components/classes
- **Imports**: Group and sort imports (1:external, 2:internal, 3:styles)
- **Types**: Use TypeScript for all new code, avoid `any` type
- **Error Handling**: Use try/catch with descriptive error messages
- **Components**: Prefer functional components with hooks over class components
- **State Management**: Use React Context API for global state, props for component state

## Project Structure
- `/src`: Application source code
- `/public`: Static assets
- `/tests`: Test files

## Tech Stack
- **Frontend**: React.js with TypeScript
- **UI Library**: Chakra UI
- **State Management**: React Context API
- **Styling**: CSS-in-JS (via Chakra UI)
- **Backend**: Node.js with Express.js
- **Database**: SQLite (or PostgreSQL if needed)
- **APIs**:
  - Weather API: Apple's Weather API or OpenWeather
  - Calendar API: Google Calendar API
  - Public Transport API: Local transit authority APIs
- **Testing**:
  - Unit Testing: Jest
  - Component Testing: React Testing Library
- **Build Tools**: Vite
- **Deployment**:
  - Device: Raspberry Pi Zero W 2
  - Frontend: Served via NGINX
  - Backend: Node.js server
  - Auto-update mechanism: Git-based or custom script

## Test Server
- Device: Raspberry Pi Zero W 2
- Hostname: raspberrypizerow2
- IP: 192.168.50.37

## Development Plan 2.0

### Epic 1: Project Foundation
- [x] Task 1.1: Project setup and configuration
  - [x] Initialize React + TypeScript project with Vite
  - [x] Configure linting and formatting tools
  - [x] Set up testing framework (Jest + React Testing Library)
  - [x] Create basic project structure
- [x] Task 1.2: Development Environment Setup
  - [x] Set up basic app shell that can run
  - [x] Configure hot reloading for development
  - [x] Create deployment script to test server (not tested yet)
  - [x] Establish verification workflow
- [x] Task 1.3: Core layout system
  - [x] Implement grid-based responsive layout
  - [x] Create layout configuration system
  - [x] Add basic theming support
- [x] Task 1.4: State management foundation
  - [x] Set up React Context API structure
  - [x] Create configuration storage system
  - [x] Implement settings persistence

### Epic 2: Core Widget Development
- [ ] Task 2.1: Clock/Date Widget
  - [ ] Create basic digital clock display
  - [ ] Add date display with formatting options
  - [ ] Implement timezone support
  - [ ] Add configuration options (12/24h, display format)
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
  - [ ] Create photo slideshow component
  - [ ] Implement Apple Photos integration
  - [ ] Add transition effects
  - [ ] Create photo source configuration
- [ ] Task 3.2: Public Transport Widget
  - [ ] Create transport display component
  - [ ] Implement local transit API integration
  - [ ] Add departure time display
  - [ ] Create transport configuration options

### Epic 4: Advanced Features
- [ ] Task 4.1: Block Scheduling
  - [ ] Create scheduling engine
  - [ ] Implement time-based widget visibility
  - [ ] Add schedule configuration interface
  - [ ] Support for recurring schedules
- [ ] Task 4.2: System Features
  - [ ] Implement offline detection
  - [ ] Add auto-refresh functionality
  - [ ] Create error handling system
  - [ ] Add logging and diagnostics

### Epic 5: UI/UX Refinement
- [ ] Task 5.1: User Interface Improvements
  - [ ] Enhance theme system with multiple options
  - [ ] Create custom widget styling options
  - [ ] Implement auto-hiding controls
  - [ ] Add animation and transitions
- [ ] Task 5.2: Accessibility Features
  - [ ] Add high contrast mode
  - [ ] Implement configurable font sizes
  - [ ] Ensure screen reader compatibility
  - [ ] Test with color vision deficiency filters

### Epic 6: Deployment and Optimization
- [ ] Task 6.1: Performance Optimization
  - [ ] Optimize render performance
  - [ ] Implement data caching system
  - [ ] Reduce memory footprint
  - [ ] Optimize network usage
- [ ] Task 6.2: Deployment Configuration
  - [ ] Create Raspberry Pi deployment package
  - [ ] Configure NGINX for frontend serving
  - [ ] Set up Node.js backend server
  - [ ] Implement auto-update mechanism

### Development Workflow
1. Work on tasks in priority order within each epic
2. Complete one epic before moving to the next when possible
3. Update task status in this document as work progresses
4. Review completed tasks at the end of each work session
5. Conduct testing after each major task completion
6. Deploy to test device after each epic completion

### Task Management Tips
- Use checkboxes to track task completion
- Add detail notes under complex tasks as needed
- Estimate and track time spent on each task
- Document any blockers or dependencies

## Testing Tools

### Using Puppeteer for Automated Testing

Puppeteer is available for automated browser testing. To use it effectively:

1. **Basic Usage**:
   ```bash
   npm test                # Runs Puppeteer tests
   npm run start-tests     # Starts dev server and shows test options
   npm run test:manual     # Starts server for manual testing
   ```

2. **Test Pages**:
   - Manual test pages available at:
     - `http://localhost:3000/tests/manual/puppeteer-test.html`
     - `http://localhost:3000/tests/manual/test.html`

3. **Sandbox Issues**:
   - If you encounter sandbox errors on Ubuntu 23.10+, use one of these options:
     - Use `--no-sandbox` flag in the Puppeteer launch options (default in our tests)
     - Set `CHROME_DEVEL_SANDBOX=/opt/google/chrome/chrome-sandbox` environment variable
     - Run `echo kernel.apparmor_restrict_unprivileged_userns=0 | sudo tee /etc/sysctl.d/60-apparmor-namespace.conf` to disable restrictions globally

4. **Test Directory Structure**:
   - `/tests` - Main test directory
     - `/puppeteer` - Puppeteer and automated test scripts
     - `/manual` - Manual test HTML pages
     - `/screenshots` - Test screenshots output

5. **Test Documentation**:
   - See `/tests/README.md` for detailed testing information
   - Test plan available at `/tests/TASK_1.3_TEST_PLAN.md`