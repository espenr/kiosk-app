# Handoff: Kiosk på ny Raspberry Pi 4

**Dato:** 2026-11-14 · **Repo:** `/home/espen/dev/kiosk-app` (GitHub `espenr/kiosk-app`)
**Neste økt:** Fortsett der vi slapp når den nye Pi 4 (8 GB) er på plass.
**Plassering:** `docs/PI4_HANDOFF.md`. Slett eller flytt til `docs/archive/` når migreringen er ferdig.

## Hovedkilde: les denne først
**`docs/PI4_MIGRATION.md`** i repoet er den komplette sjekklisten, med status, tilstand som må bevares, kommandoer og repo-endringer.
Dette dokumentet gjentar den ikke, men gir bare kontekst og nåværende tilstand.

## Kort bakgrunn
- Kiosk-Pi-en var en **Raspberry Pi 2 Model B** med USB-wifi-pinne. Den døde 2026-10-11. Brukeren trodde først det var en Zero 2 W, men loggene viste noe annet.
- Det nye vertsnavnet er bestemt: **`kiosk`** (`kiosk.local`). Det gamle var `pi` (`pi.local`).
- Det gamle SD-kortet (Kingston Canvas Select Plus, 16 GB) kjører Raspberry Pi OS Trixie med 32-biters brukerland og LXDE/X11. Appen er installert som releaser, og en auto-updater henter nye releaser fra GitHub.

## Tilstand nå
- **Sikkerhetskopi tatt og kontrollert:** `~/kiosk-sd-2026-11-14.img` med tilhørende `.sha256`. Sjekksum, e2fsck og fsck.fat er OK, og `kiosk-data`, `.env`, bruker-unitene og oppstartsfilene for Pi 4 er med. Bildet inneholder hemmeligheter, så det skal ikke inn i repoet eller i skyen ukryptert. Det originale kortet er urørt.
- **Git:**
  - `main` er synket med `origin/main`. Commitene `25f1b164` (slutter å spore `node_modules`) og `28e9cdfd` (migreringsdokumentet + `scripts/systemd/kiosk.service` og `tv-boot-on.service`) er pushet.
  - **Én lokal commit er ikke pushet:** statusoppdateringen om backup i `PI4_MIGRATION.md`.
  - Den gamle lokale historikken ligger på grenen `stale-docs-restructure`. Den er kun til referanse og skal ikke cherry-pickes.
- **Hver push til `main` bygger og publiserer en ny release** (`.github/workflows/release.yml`), og Pi-en henter den automatisk. Siste release er `v2026.11.14.155`, og den bygde uten feil.
- Planfilen med begrunnelser og Opus-vurderingen: `/home/espen/.claude/plans/bruk-en-opsu-5-5-kind-babbage.md`

## Neste steg (detaljer i PI4_MIGRATION.md)
1. Gå gjennom maskinvaren i §2: micro-HDMI til HDMI0, 5V/3A USB-C, kjøling, wifi-pinnen trukket ut, og reservert IP i ruteren.
2. Skriv bildet til et **nytt kort på minst 32 GB** med Raspberry Pi Imager → *Use custom*, **uten** OS-tilpasninger. Utvid deretter filsystemet.
3. Følg §3, første oppstart som `pi.local`: kontroller, tjenester, `/api/health`, `xrandr`/CEC, og sjekk kjerne og apt før en eventuell full-upgrade.
4. Følg §4, bytt navn til `kiosk`: **slå av cloud-init først**, ellers settes navnet tilbake ved neste oppstart.
5. Følg §5, repo-endringer: vertsnavn og IP i `deploy.sh`/`setup-deploy.sh`, `pi.local` → `kiosk.local`, maskinvareteksten, og logrotate.
   Husk at pushen lager en ny release.

## Åpne spørsmål
- **Riktig IP-adresse:** `deploy.sh` bruker `.214`, mens annen dokumentasjon sier `.37`. Det avgjøres av IP-reservasjonen i ruteren for Pi 4.
- **CEC-port og HDMI-navn på Pi 4:** må verifiseres på enheten. Eventuelle rettelser skal inn i repoet, ikke gjøres direkte på Pi-en, fordi auto-updateren overskriver dem.
- **Om `--disable-gpu` kan fjernes:** må testes på enheten.
- **Om docs-omleggingen fra `stale-docs-restructure` skal gjøres på nytt:** utsatt.

## Merknader for agenten
- Kommandoer som krever sudo kan ikke kjøres via `!`-prompten fordi den mangler TTY for passord. Be brukeren bruke et vanlig terminalvindu eller `pkexec`.
- Svar brukeren på norsk. Dokumentasjonen i repoet er på engelsk.

## Foreslåtte skills
- **`smith-felles:folder-architect`**: bare hvis docs-omleggingen skal gjøres på nytt oppå `origin/main`.
- **`code-review`**: før push av repo-endringene i §5, siden pushen publiserer en release til kiosken.
- **`run`**: for å starte appen lokalt og sjekke endringer, for eksempel `RecoveryPage.tsx`, før push.
