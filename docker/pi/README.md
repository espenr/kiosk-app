# Pi emulator

A container that runs the kiosk's server stack the way the Raspberry Pi 4 does, so releases can be tested
locally before they reach the TV.

## What it mirrors

| Pi 4 | Emulator |
|---|---|
| Raspberry Pi OS Trixie, 32-bit userland (armhf) | `debian:trixie-slim`, `linux/arm/v7` via QEMU (or native amd64) |
| `/var/www/kiosk` → `/var/www/kiosk-releases/<ver>` | Same, built from the same files as the release tarball |
| `/var/www/kiosk-data` linked as `server/data` | Same, bind-mounted from `docker/pi/data/` |
| `kiosk-photos.service`: Node on :3001 as `pi` | Same, started by `entrypoint.sh` |
| nginx `sites-available/kiosk` | `nginx-kiosk.conf` |
| `.env` in the release dir | `docker/pi/env` mounted at `/var/www/kiosk/.env` |

**Not emulated:** Chromium/X11 kiosk, CEC, unclutter, systemd timers and the GitHub auto-updater.
`screenshot` uses headless Chrome at 1080x1920 as a stand-in for the portrait TV.

## Usage

```bash
./scripts/pi-emulator.sh up --native   # fast amd64 build
./scripts/pi-emulator.sh up            # armhf like the Pi (needs QEMU, see below)
./scripts/pi-emulator.sh status
./scripts/pi-emulator.sh screenshot /tmp/emu.png
./scripts/pi-emulator.sh shell
./scripts/pi-emulator.sh down
```

Open http://localhost:8080 (dashboard) and http://localhost:8080/admin. Change the port with `PI_PORT=...`.

### armhf on an x86 machine

Register QEMU binfmt once per boot (privileged container):

```bash
docker run --privileged --rm tonistiigi/binfmt --install arm
```

The build stage runs natively; only `apt-get install`, `npm ci` and the runtime run under QEMU.
The first armhf build takes about 11 minutes. Later builds reuse the cached apt layer, but `npm ci` reruns
under QEMU whenever the source changes. Use `--native` while iterating, and armhf to verify before a release.

## State

`docker/pi/data/` and `docker/pi/env` are gitignored. Empty data gives a fresh Pi: the admin setup wizard.

To run with the real kiosk state, copy `kiosk-data` from the SD backup image (read-only mount, needs sudo):

```bash
LOOP=$(sudo losetup -rPf --show ~/kiosk-sd-2026-11-14.img)
sudo mkdir -p /mnt/kiosk-img && sudo mount -o ro,noload ${LOOP}p2 /mnt/kiosk-img
sudo cp -a /mnt/kiosk-img/var/www/kiosk-data/. docker/pi/data/
sudo cp /mnt/kiosk-img/var/www/kiosk/.env docker/pi/env
sudo chown -R $USER: docker/pi/data docker/pi/env
sudo umount /mnt/kiosk-img && sudo losetup -d $LOOP
```

This data holds secrets (Google service-account key, PIN hash, machine secret). Never commit it.
