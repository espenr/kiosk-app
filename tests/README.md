# Kiosk App Testing

This directory contains all test-related files for the Kiosk App project.

## Directory Structure

- `/tests` - Root test directory
  - `/puppeteer` - Puppeteer automated browser testing
  - `/manual` - Manual test pages
  - `/screenshots` - Generated screenshots from automated tests

## Test Types

### Automated Browser Tests

Puppeteer is used for browser automation testing:

```bash
# From project root
node tests/puppeteer/puppeteer-test.js
```

Or use the test runner script:

```bash
# From project root
./tests/puppeteer/run-puppeteer-test.sh
```

### Manual Tests

Manual test pages are available in the `/manual` directory and can be accessed through the browser:

- `puppeteer-test.html` - Test page for layout and theme functionality
- `test.html` - General test page for all components

To use these pages, start the development server and navigate to:
```
http://localhost:3000/tests/manual/puppeteer-test.html
http://localhost:3000/tests/manual/test.html
```

### Test Runner

The `start-and-test.js` script starts the development server and provides testing options:

```bash
# From project root
node tests/start-and-test.js
```

## Sandbox Issues with Puppeteer

If you encounter sandbox errors on Ubuntu 23.10+, use one of these options:

1. Use `--no-sandbox` flag in the Puppeteer launch options (already configured in our scripts)
2. Set `CHROME_DEVEL_SANDBOX=/opt/google/chrome/chrome-sandbox` environment variable
3. Run `echo kernel.apparmor_restrict_unprivileged_userns=0 | sudo tee /etc/sysctl.d/60-apparmor-namespace.conf` to disable restrictions globally

## Screenshot Storage

Automated tests generate screenshots in the `/tests/screenshots` directory for visual verification. Each test step creates a separate screenshot.

## Test Documentation

- `TASK_1.3_TEST_PLAN.md` - Detailed test plan for Task 1.3 layout system