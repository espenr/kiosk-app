#!/bin/bash
# Starts what systemd starts on the Pi: kiosk-photos.service (Node on :3001) and nginx.
set -euo pipefail

echo "Pi emulator: $(dpkg --print-architecture) userland, $(uname -m) kernel, node $(node -v)"
echo "Release: $(readlink /var/www/kiosk) ($(cat /var/www/kiosk/VERSION))"

# The data volume may be mounted with host ownership
chown -R pi:pi /var/www/kiosk-data
chmod 700 /var/www/kiosk-data

# An .env mounted at /var/www/kiosk/.env is read by the backend itself (server/src/index.ts loadEnv)
cd /var/www/kiosk/server
runuser -u pi -- env PORT=3001 node /var/www/kiosk/server/dist/index.js &
BACKEND_PID=$!

nginx -g 'daemon off;' &
NGINX_PID=$!

# If either process dies, stop the container (Docker's restart policy plays systemd's Restart=always)
wait -n "$BACKEND_PID" "$NGINX_PID"
echo "A service exited, stopping container"
exit 1
