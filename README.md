# Kiosk Application

A full-screen kiosk display application for home/office use showing various information widgets. Built with React, TypeScript, and Vite.

## Features

- Clock/Date Widget
- Weather Widget (Apple Weather API)
- Calendar Widget (Google Calendar)
- Photo Display (Apple Photos)
- Public Transport Widget
- Block Scheduling
- UI Customization

## Development

### Prerequisites

- Node.js 14+
- npm

### Installation

```bash
# Install dependencies
npm install
```

### Development Commands

```bash
# Start the development server with hot-reload
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Run type checking
npm run typecheck

# Deploy to test server (Raspberry Pi)
npm run deploy
```

### Development Workflow

1. Make changes to the code
2. Test locally using `npm run dev`
3. Check for errors with `npm run lint` and `npm run typecheck`
4. Deploy to test server with `npm run deploy`
5. Update task status in CLAUDE.md

## Deployment

The application is designed to be deployed on a Raspberry Pi Zero W 2:

- Hostname: raspberrypizerow2
- IP: 192.168.50.37

## Project Structure

- `/src`: Application source code
- `/public`: Static assets
- `/tests`: Test files
- `/docs`: Documentation and design documents

## Documentation

- [Project Development Guide](CLAUDE.md): Main development guide and task tracking
- [Project Knowledge Base](PROJECT_KNOWLEDGE.md): Accumulated project knowledge and decisions
- [Widget Development Guide](docs/WIDGET_DEVELOPMENT_GUIDE.md): Guide for creating new widgets
- [Widget Development Checklist](docs/WIDGET_DEVELOPMENT_CHECKLIST.md): Checklist for widget implementation

Refer to these documents for detailed development information.