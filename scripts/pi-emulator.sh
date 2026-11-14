#!/bin/bash
# Run the kiosk server stack in a container that mimics the Raspberry Pi 4.
# See docker/pi/README.md.
#
#   ./scripts/pi-emulator.sh up [--native]   build and start (armhf via QEMU, or --native amd64)
#   ./scripts/pi-emulator.sh down            stop and remove the container
#   ./scripts/pi-emulator.sh logs            follow logs
#   ./scripts/pi-emulator.sh shell           bash inside the "Pi"
#   ./scripts/pi-emulator.sh status          health, version and arch
#   ./scripts/pi-emulator.sh screenshot      1080x1920 screenshot like the portrait TV
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/docker/pi"
export PI_PORT="${PI_PORT:-8080}"
export PI_PLATFORM="${PI_PLATFORM:-linux/arm/v7}"
export PI_TAG="${PI_TAG:-armhf}"
export KIOSK_VERSION="${KIOSK_VERSION:-v$(date +%Y.%m.%d).$(git -C "$ROOT" rev-list --count HEAD).docker}"

compose() { docker compose -f "$DIR/docker-compose.yml" "$@"; }

ensure_qemu() {
  [[ "$PI_PLATFORM" == linux/amd64 ]] && return
  if ! ls /proc/sys/fs/binfmt_misc/ 2>/dev/null | grep -q -E '^qemu-arm$'; then
    echo "QEMU binfmt for ARM is not registered, so armhf containers cannot run on this x86 machine."
    echo "Register it once per boot (privileged):"
    echo "  docker run --privileged --rm tonistiigi/binfmt --install arm"
    echo "Or use the faster native build: $0 up --native"
    exit 1
  fi
}

case "${1:-}" in
  up)
    if [[ "${2:-}" == --native ]]; then export PI_PLATFORM=linux/amd64 PI_TAG=amd64; fi
    ensure_qemu
    mkdir -p "$DIR/data"
    [[ -f "$DIR/env" ]] || : > "$DIR/env"
    compose up -d --build
    echo "Waiting for backend health..."
    for _ in $(seq 1 60); do
      if curl -sf "http://localhost:$PI_PORT/api/health" >/dev/null; then
        echo "Up: http://localhost:$PI_PORT  (admin: http://localhost:$PI_PORT/admin)"
        exit 0
      fi
      sleep 2
    done
    echo "Backend did not become healthy. Logs:"; compose logs --tail=50; exit 1
    ;;
  down) compose down ;;
  logs) compose logs -f ;;
  shell) docker exec -it kiosk-pi-emulator bash ;;
  status)
    docker exec kiosk-pi-emulator bash -c \
      'echo "arch: $(dpkg --print-architecture)/$(uname -m)  node: $(node -v)  release: $(readlink /var/www/kiosk)"'
    curl -s "http://localhost:$PI_PORT/api/version"; echo
    curl -s "http://localhost:$PI_PORT/api/health"; echo
    ;;
  screenshot)
    out="${2:-/tmp/kiosk-emulator-screenshot.png}"
    node -e '
      const puppeteer = require(process.argv[1]);
      (async () => {
        const b = await puppeteer.launch({ args: ["--no-sandbox"] });
        const p = await b.newPage();
        await p.setViewport({ width: 1080, height: 1920 });
        await p.goto(process.argv[2], { waitUntil: "load", timeout: 60000 });
        await new Promise(r => setTimeout(r, 5000));
        await p.screenshot({ path: process.argv[3] });
        await b.close();
      })().catch(e => { console.error(e); process.exit(1); });
    ' "$ROOT/node_modules/puppeteer" "http://localhost:$PI_PORT" "$out"
    echo "Saved $out"
    ;;
  *) sed -n 2,11p "$0"; exit 1 ;;
esac
