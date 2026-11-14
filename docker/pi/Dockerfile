# Pi emulator: runs the kiosk server stack the way the Raspberry Pi 4 does.
#
# Mirrors the Pi (see docs/PI4_MIGRATION.md):
#   - Debian Trixie userland, armhf by default (Pi OS Trixie, 32-bit userland)
#   - Release layout: /var/www/kiosk -> /var/www/kiosk-releases/<version>
#   - Shared state in /var/www/kiosk-data, linked as server/data
#   - Backend on :3001 run as user `pi` (scripts/kiosk-photos.service)
#   - Nginx serving /var/www/kiosk/dist and proxying /api/ to :3001
#
# Not emulated: Chromium/X11, CEC, unclutter, systemd timers, the GitHub auto-updater.
#
# Build for the Pi's arch (needs QEMU binfmt on x86):  --platform linux/arm/v7
# Fast native build for iteration:                     --platform linux/amd64

# ---- Build stage: same steps as .github/workflows/release.yml, run natively ----
FROM --platform=$BUILDPLATFORM node:20-bookworm-slim AS build
ARG KIOSK_VERSION=v0000.00.00.docker
WORKDIR /src

COPY package.json package-lock.json ./
RUN PUPPETEER_SKIP_DOWNLOAD=1 npm ci

COPY server/package.json server/package-lock.json server/
RUN cd server && npm ci

COPY . .
RUN echo "{\"version\":\"$KIOSK_VERSION\"}" > src/version.json \
 && npm run build \
 && cd server && npm run build

# Same contents as the release tarball
RUN mkdir -p /release/server \
 && cp -r dist /release/ \
 && cp -r server/dist /release/server/ \
 && cp server/package.json server/package-lock.json /release/server/ \
 && cp package.json /release/ \
 && cp -r scripts /release/ \
 && echo "$KIOSK_VERSION" > /release/VERSION

# ---- Runtime stage: Debian Trixie on the target arch, like the Pi ----
FROM debian:trixie-slim
ARG KIOSK_VERSION=v0000.00.00.docker

RUN apt-get update \
 && apt-get install -y --no-install-recommends nginx nodejs npm curl ca-certificates tini \
 && rm -rf /var/lib/apt/lists/* \
 && useradd -m -s /bin/bash pi

COPY --from=build /release /var/www/kiosk-releases/${KIOSK_VERSION}

# What auto-update.sh does on deploy: install server deps, link shared data, flip the symlink
RUN cd /var/www/kiosk-releases/${KIOSK_VERSION}/server \
 && npm ci --omit=dev \
 && mkdir -p /var/www/kiosk-data \
 && ln -sfn /var/www/kiosk-data /var/www/kiosk-releases/${KIOSK_VERSION}/server/data \
 && ln -sfn /var/www/kiosk-releases/${KIOSK_VERSION} /var/www/kiosk \
 && chown -R pi:pi /var/www/kiosk-releases /var/www/kiosk-data

COPY docker/pi/nginx-kiosk.conf /etc/nginx/sites-available/kiosk
RUN rm -f /etc/nginx/sites-enabled/default \
 && ln -s /etc/nginx/sites-available/kiosk /etc/nginx/sites-enabled/kiosk

COPY docker/pi/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

VOLUME /var/www/kiosk-data
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s \
  CMD curl -sf http://localhost:3001/api/health || exit 1

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/entrypoint.sh"]
