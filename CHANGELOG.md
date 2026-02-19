# Changelog

All notable changes to this project will be documented in this file.

## [2026-02-19] - Test Cleanup

### Removed
- **Obsolete test files** for old widget-based architecture:
  - `public/puppeteer-test.html`, `public/test.html` (old widget test pages)
  - `tests/puppeteer/` directory (5 Puppeteer test files for old widgets)
  - `tests/start-and-test.js` (test runner referencing deleted files)
  - `tests/state-management-test.html` (old state management tests)
- **Total removed:** 8 test files (~40 KB)

### Changed
- Rewrote `tests/README.md` to reflect current testing approach
- Documented manual testing procedures for fixed-layout architecture
- Explained why automated browser tests were removed

## [2026-02-19] - Documentation Cleanup & Audit

### Removed
- **15 obsolete documentation files** describing old widget-based architecture:
  - Root level: `PROJECT_KNOWLEDGE.md`, `requirements.md`, `MANUAL-TEST-GUIDE.md`
  - docs/ main: `CURRENT_STATUS.md`, `OPTIMIZATION_RESULTS.md`, `TECH_STACK_AUDIT.md`, `WIDGET_DEVELOPMENT_GUIDE.md`, `WIDGET_DEVELOPMENT_CHECKLIST.md`
  - docs/widgets/: Entire directory (old widget design docs)
  - tests/: `TASK_*.md` test plans, `TEST_2.1_RESULTS.md`, `manual/` directory
- **1 obsolete directory**: `docs/summaries/` (early development summaries)

### Changed
- Archived historical implementation documentation (PHASE*.md, SESSION*.md files) to `docs/archive/implementation-history/`
- Updated CLAUDE.md to reflect completion of Phase 7 (Admin View implementation)
- All admin view phases (4-7) are now marked as complete
- **Documentation reduction**: 42 files → 20 files (52% reduction, excluding archive)

### Added
- `docs/DOCUMENTATION_AUDIT.md` - Comprehensive audit report
- `docs/archive/implementation-history/README.md` - Archive index

## [2026-02-19] - Deployment Architecture Fix

### Fixed
- **Inconsistent deployment directory structures**: Manual deploy (`deploy.sh`) now creates `/var/www/kiosk/dist/` instead of flattening files to `/var/www/kiosk/`, matching auto-deploy behavior
- **Nginx configuration conflicts**: Single Nginx configuration (`root /var/www/kiosk/dist;`) now works for both manual and auto-deploy methods

### Changed
- `scripts/deploy.sh`: Changed rsync destination from `$PI_DIR/` to `$PI_DIR/dist/` to preserve dist/ subdirectory
- `scripts/setup-photo-server.sh`: Added automatic Nginx root verification and correction
- Nginx configuration: Updated to consistently point to `/var/www/kiosk/dist`

### Added
- `docs/architecture/deployment.md`: Comprehensive deployment architecture documentation
- Directory structure documentation in `docs/architecture/raspberry-pi-infrastructure.md`
- Deployment architecture section in `CLAUDE.md`

### Migration
- Existing installations: Run `sudo sed -i 's|root /var/www/kiosk;|root /var/www/kiosk/dist;|' /etc/nginx/sites-available/default && sudo systemctl reload nginx`
- Clean up old root-level files: `cd /var/www/kiosk && sudo rm -rf index.html test.html puppeteer-test.html assets/`
