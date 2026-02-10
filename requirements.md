# Kiosk Application Requirements

Based on the analysis of the DAKboard application, this document outlines the requirements for our custom kiosk application that will replicate and enhance similar functionality.

## Overview

The application will be a full-screen kiosk display that shows various information widgets designed for home/office use. The display will automatically update and refresh content at regular intervals.

## Page Components

### Core Components

1. **Clock/Date Widget**
   - Display current time in digital format with configurable 12/24 hour mode
   - Show date with customizable format (day of week, day, month)
   - Support for different timezones
   - Optional seconds display
   - Support for multiple languages

2. **Calendar Widget**
   - Monthly view with week numbers
   - Daily events display with time, title, and location
   - Color-coded events by source/category
   - Support for Google Calendar integration only
   - Visual indicators for current day
   - Configurable appearance (font size, alignment)
   - Support for recurring events
   - Support for all-day events

3. **Weather Widget**
   - Current conditions (temperature, weather icon)
   - Daily forecast with hourly breakdown
   - Supports temperature units (°C/°F)
   - Weather icons for different conditions
   - Multiple location support
   - Integration with Apple's Weather API

4. **Photo Display**
   - Full-screen photo display
   - Slideshow functionality with configurable transition times
   - Support for various photo sources (local, cloud services)
   - Optional blur effect for background
   - Support for photo metadata display
   - Integration with Apple Photos

5. **Public Transport Widget**
   - Real-time departure information for nearby stops
   - Display route numbers, destinations, and departure times
   - Support for different transit types (bus, train, etc.)
   - Status indicators for delays/cancellations
   - Configurable for specific routes of interest

### Additional Features

1. **Block Scheduling**
   - Time-based showing/hiding of widgets
   - Support for daily, weekly, monthly schedules
   - Schedule based on sunrise/sunset times

2. **UI Features**
   - Full-screen mode
   - Auto-hiding controls
   - Configurable themes/backgrounds
   - Layout editor for component positioning
   - Responsive design for different screen sizes

3. **System Features**
   - Offline detection with visual indicator
   - Automatic content refresh
   - Error handling for widget loading failures
   - Frontend error logging to backend logging endpoint
   - Comprehensive error reporting and diagnostics system

## Technical Requirements

1. **Architecture**
   - Frontend: React with TypeScript
   - Styling: Chakra UI (CSS-in-JS) - chosen for its ease of use, built-in theming capabilities, and accessible component library.
   - State Management: React Context API
   - Backend: Node.js with Express.js (chosen for its lightweight nature, flexibility, and extensive middleware ecosystem)
     - **Logging Endpoint**: REST API endpoint for client-side error logging
     - **Logging System**: Winston-based server-side logging with rotation and levels
     - **Error Monitoring**: Structured logging for easier analysis and alerting
   - Database: SQLite (preferred for lightweight, single-user setups) or PostgreSQL (recommended for scenarios requiring scalability and high concurrent access)
   - **Modular API Integration**:
     - Design the backend with a provider-agnostic architecture.
     - Use an abstraction layer for API calls to external services (e.g., calendar, weather, transport).
     - Ensure easy switching between providers (e.g., Google Calendar to Apple Calendar) by:
       - Implementing provider-specific modules.
       - Conforming to a common interface for all modules.

2. **APIs and Integrations**
   - Weather API (Apple's Weather API, OpenWeather, etc.)
   - Calendar API (Google Calendar only)
   - Public transport APIs (local transit authority)
   - Time/Date services with timezone support
   - Photo API (Apple Photos)

3. **Performance**
   - Optimized for long-running display
   - Minimal memory footprint
   - Efficient network usage with caching
   - Graceful handling of network interruptions

4. **Deployment**
   - Device: Raspberry Pi Zero W 2
   - Frontend: Served via NGINX
   - Backend: Node.js server
   - Auto-update mechanism: Git-based or custom script
   - Easy installation process
   - Remote configuration capability
   - Auto-update mechanism

5. **Testing**
   - Unit Testing: Jest
   - Component Testing: React Testing Library

6. **Build Tools**
   - Bundler: Vite

## Layout Structure

The application will use a grid-based layout system with:
- Absolute positioning of components
- Percentage-based sizing for responsive design
- Z-index management for overlapping components
- Support for different aspect ratios

## Component Design

1. **Clock/Date**
   - Large, readable font at top of screen
   - Configurable color and opacity

2. **Calendar**
   - Multi-column display (day of week headers, date grid)
   - Event list with time, title, location
   - Scrollable for many events
   - Integration with Google Calendar only

3. **Weather**
   - Horizontal layout for hourly forecast
   - Current conditions prominently displayed
   - Icon-based weather representation
   - Integration with Apple's Weather API

4. **Photos**
   - Full-screen or contained background
   - Smooth transitions between images
   - Optional overlay for other content
   - Integration with Apple Photos

5. **Transport**
   - Compact table layout
   - Route number, destination, departure time columns
   - Status indicators for each departure

## Accessibility Requirements

1. High contrast text options
2. Configurable font sizes
3. Screen reader compatibility
4. Color schemes suitable for color vision deficiencies