# Pi 4 Migration

**Started:** 2026-11-14
**Status:** Waiting for hardware. The repo is synced. **The SD card is backed up and verified** (2026-11-14):
`~/kiosk-sd-2026-11-14.img` (15,634,268,160 bytes) with `.sha256` on the dev machine. Both filesystems pass a check,
and `kiosk-data`, `.env`, the user units and the Pi 4 boot files are present. Next step: §2 (hardware) when the Pi arrives;
§1 can be skipped.

The kiosk Pi, a **Raspberry Pi 2 Model B** with a USB Wi-Fi dongle, died on **2026-10-11**. It rebooted at
17:28 and 17:56, and its last log line was at 18:59. The replacement is a **Raspberry Pi 4 Model B, 8 GB**.
The old SD card is a Kingston Canvas Select Plus, 16 GB. When the migration is done, move this doc to `docs/archive/`.

New hostname: **`kiosk`** (`kiosk.local`), replacing `pi` (`pi.local`).

---

## 0. What the old card contains (inspected 2026-11-14)

| Item | Value |
|---|---|
| OS | Raspberry Pi OS **Trixie**, image 2025-12-04, **32-bit userland (armhf)** |
| Desktop | LXDE on X11, lightdm autologin (`autologin-session=LXDE`) |
| Kernels | v6/v7 at 6.12.62; **v8 (used by the Pi 4) at 6.12.47** |
| Hostname | `pi`, **set by cloud-init** (`bootfs/user-data`: `hostname: pi`, `manage_etc_hosts: true`) |
| App | `/var/www/kiosk` → `/var/www/kiosk-releases/v2026.04.05.153` (the latest release) |
| Display | Chromium from the user unit `kiosk.service`, `xrandr --output HDMI-1 --rotate left` |
| Network | NetworkManager + netplan (`/etc/netplan/90-NM-*.yaml`, root-only, not yet read) |

### State that is NOT in the repo and must survive
| Path on the Pi | What it is |
|---|---|
| `/var/www/kiosk-data/` | `machine.secret` + `config.enc.json`, `auth.json`, `config.internal.json` (Google service-account key), `config.public.json` |
| `/var/www/kiosk-releases/<ver>/.env` | `ICLOUD_ALBUM_URL`. `auto-update.sh` carries it from release to release |
| `~/.config/systemd/user/kiosk.service`, `tv-boot-on.service` | **Now copied into `scripts/systemd/`** (2026-11-14) |

`machine.secret` is random (`server/src/utils/crypto.ts`) and not tied to the hardware. As long as the whole
`kiosk-data/` folder comes along, `config.enc.json` can be read on any board.

---

## 1. Back up the card (do this first)

The card is the only copy of the state above. Back it up **before** it goes into the Pi 4, because the first boot
writes to it. The commands need sudo.

```bash
sync && udisksctl unmount -b /dev/mmcblk0p1 && udisksctl unmount -b /dev/mmcblk0p2
sudo dd if=/dev/mmcblk0 of=$HOME/kiosk-sd-2026-11-14.img bs=4M status=progress conv=fsync
sudo chown $USER: $HOME/kiosk-sd-2026-11-14.img
sha256sum $HOME/kiosk-sd-2026-11-14.img > $HOME/kiosk-sd-2026-11-14.img.sha256
```

Verify the image read-only:
```bash
LOOP=$(sudo losetup -rPf --show $HOME/kiosk-sd-2026-11-14.img)
sudo e2fsck -fn ${LOOP}p2
sudo mkdir -p /mnt/kiosk-img && sudo mount -o ro,noload ${LOOP}p2 /mnt/kiosk-img
sudo ls -l /mnt/kiosk-img/var/www/kiosk-data/machine.secret
sudo cat /mnt/kiosk-img/etc/netplan/90-NM-*.yaml   # look for a static IP or MAC binding
sudo umount /mnt/kiosk-img && sudo losetup -d $LOOP
```

- The image contains secrets: the Wi-Fi passphrase, the service-account key and the PIN salt. Keep it **outside the repo**, offline or encrypted.
- **Recommended:** write the image to a **new** card and boot that one, so the original stays untouched.
  The Pi died after several reboots in a row, so a failing card or power supply is possible.

---

## 2. Hardware checklist

- [ ] **Micro-HDMI** cable to the TV, in **HDMI0** (the port next to USB-C)
- [ ] **USB-C supply, 5 V / 3 A** (the official 15 W one)
- [ ] **Cooling** (heatsink or case), because it runs 24/7
- [ ] **Leave the USB Wi-Fi dongle unplugged** and use the onboard Wi-Fi. Otherwise the interface names can swap.
- [ ] In the router: reserve an IP for the Pi 4's Wi-Fi MAC address (the old addresses disappear with the Pi 2)

---

## 3. First boot on the Pi 4 (old setup, still `pi.local`)

The card should boot as it is: bootfs has `start4*.elf`, `fixup4*.dat`, `bcm2711-rpi-4-b.dtb` and `kernel8.img`.
The Pi 4 picks a **64-bit kernel with a 32-bit userland**. That is expected; **never set `arm_64bit=0`**.

```bash
ssh pi@pi.local            # or the IP from the router
uname -m                   # expected: aarch64
dpkg --print-architecture  # expected: armhf
free -h                    # ~7.6 GiB
vcgencmd measure_temp
vcgencmd get_throttled     # 0x0 = OK
sudo dmesg | grep -iE "mmc|i/o error|ext4"

systemctl status kiosk-photos kiosk-updater.timer tv-on.timer tv-off.timer
systemctl --user status kiosk tv-boot-on unclutter
curl -s localhost:3001/api/health

DISPLAY=:0 xrandr -q      # output should still be HDMI-1, rotated left
ls /dev/cec*               # the Pi 4 has cec0 and cec1
cec-client -l

apt-mark showhold
apt policy linux-image-rpi-v8   # the v8 kernel is behind v7; check before any full-upgrade
```

### Pi 4 adjustments
- **`--disable-gpu`** in `kiosk.service`: try removing it on the Pi 4. Treat it as an experiment and keep it out if rendering is stable.
- **CEC:** `tv-control.sh` runs `cec-client -s -d 1` without naming a device. If it hits the wrong port, pin
  the device **in the repo** (`scripts/tv-control.sh`). The auto-updater overwrites `/var/www/kiosk/scripts` with each release.
- **TV in standby at boot:** the last Xorg log shows "HDMI-1 disconnected → 1024x768". `hdmi_force_hotplug` is
  ignored under full KMS. If this happens, add `video=HDMI-A-1:1920x1080@60D` to `cmdline.txt`.

---

## 4. Rename to `kiosk`

cloud-init resets the hostname and `/etc/hosts` at boot, so disable it first.
That is safe here, because the network config lives in NetworkManager and netplan, not in cloud-init.

```bash
sudo touch /etc/cloud/cloud-init.disabled
sudo hostnamectl hostname kiosk
sudo sed -i 's/^127\.0\.1\.1.*/127.0.1.1 kiosk/' /etc/hosts
sudo systemctl restart avahi-daemon
sudo reboot
# from the dev machine:
ping kiosk.local && ssh pi@kiosk.local hostname
ssh-keygen -R 192.168.50.37; ssh-keygen -R 192.168.50.214; ssh-keygen -R pi.local
```

What else the rename affects:
- **The app is unaffected.** Calendar uses a service account, so there are no OAuth redirect URIs. The auto-updater only talks to
  `api.github.com`, and nginx uses `server_name _`.
- **Bookmarks** to `http://pi.local/admin` (phones, browsers) must be updated.

---

## 5. Repo changes once the rename works

- [ ] `scripts/deploy.sh` and `scripts/setup-deploy.sh`: today they disagree (`pi` + `.214` vs. `.37`). Make them
      the same and overridable: `PI_MDNS="${PI_MDNS:-kiosk.local}"`, `PI_IP="${PI_IP:-<reserved IP>}"`
- [ ] `pi.local` → `kiosk.local` in `CLAUDE.md`, `README.md`, `scripts/refresh-tv.sh`,
      `scripts/verify-pi-config.sh`, `src/**/RecoveryPage.tsx`
- [ ] Hardware, OS and IP in `docs/architecture/raspberry-pi-infrastructure.md` and on the "Target Device" line in `CLAUDE.md`
- [ ] Install instructions for the user units now in `scripts/systemd/` (`kiosk.service`, `tv-boot-on.service`):
      `~/.config/systemd/user/`, then `systemctl --user enable kiosk tv-boot-on unclutter`
- [ ] Add a logrotate rule for `/var/log/kiosk-updater.log`. It reached ~10 MB with no rotation.

Find leftovers: `git grep -nE "pi\.local|192\.168\.50\.(37|214)|Raspberry Pi 2|Pi 2 Model"`

---

## 6. Later (optional): fresh 64-bit OS

When the old card has proven it works, you can reinstall **Raspberry Pi OS (64-bit)** with Raspberry Pi Imager.
In Imager, set the hostname to `kiosk`, the user to `pi`, an SSH key and Wi-Fi.
Then restore `/var/www/kiosk-data/`, `.env`, nginx config, the systemd units (system and user) and the timers from the backup image.
The server dependencies are plain JS, and the updater runs `npm ci` on the Pi, so 64-bit won't break the backend.
Expect new SSH host keys (`ssh-keygen -R`).

---

## Done when
- [ ] The dashboard renders rotated after a cold boot, with no cursor and no blanking
- [ ] `/api/health` OK, calendar/Tibber/photos showing data
- [ ] The TV switches on at 06:00 and off at 23:30
- [ ] `ssh pi@kiosk.local` works after a reboot, and `npm run deploy` reaches the Pi
- [ ] `vcgencmd get_throttled` = `0x0` after a day of uptime
