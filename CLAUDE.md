# Rejtek — self-hosted LAN password manager

Personal password manager. A server runs as a Docker container on the home LAN and is **never exposed to the internet**. A mobile app works fully offline and syncs **manually** with the server when on home Wi-Fi. Small user base (owner + family); app-store release possible later.

## Components

| Component        | Stack                                           | Purpose                                                                                  |
| ---------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `server/`        | C# ASP.NET Core (Minimal APIs), EF Core, SQLite | Users, devices/pairing, encrypted vault storage, serves the web app                      |
| `web/`           | React + TypeScript (Vite)                       | LAN web UI: register/login, vault CRUD + search, QR pairing, device management           |
| `mobile/`        | React Native (Expo, dev build) + TypeScript     | Android first, iOS later. Offline vault, biometric unlock, sync                          |
| `extension/`     | React + TypeScript, WebExtension (Manifest V3)  | Firefox only (for now). Search/copy credentials, paired like a device                    |
| `packages/core/` | TypeScript                                      | Shared: crypto, data models, sync/diff logic, API client. Used by web, mobile, extension |

Monorepo with npm workspaces for TS packages. Server is a separate .NET solution.

## Security model (non-negotiable)

- **Zero-knowledge**: all encryption/decryption happens on clients (`packages/core`). Server stores only ciphertext and never sees the master password or keys.
- Crypto library: **libsodium** everywhere (`libsodium-wrappers-sumo` on web/extension, `react-native-libsodium` on mobile), injected into `packages/core` via the `Sodium` interface.
- Master password (NFKC-normalised) + per-user salt → **Argon2id** → master key → `crypto_kdf` splits into:
  - `encryptionKey`: wraps the random 256-bit **vault key** (XChaCha20-Poly1305).
  - `authKey`: sent to server for login; server stores only a salted PBKDF2-SHA256 hash (input is already a 256-bit Argon2id output).
- Each vault item encrypted with the vault key (XChaCha20-Poly1305, random 24-byte nonce, item id as associated data). Item name/URL/username/password/notes are all encrypted; server sees only `id`, `version`, timestamps, `deleted` flag.
- Forgotten master password = unrecoverable data. Make this clear in the UI.
- **HTTPS always**, even on LAN (Web Crypto requires a secure context; Android blocks cleartext). Container generates a self-signed cert on first start. Mobile/extension **pin the cert fingerprint** received via pairing QR.
- Never log secrets, plaintext items, tokens or keys. Never show passwords in sync diff views.
- Mobile: vault key stored in Android Keystore / iOS Keychain behind biometric/device-credential auth. Passwords revealed only after biometric prompt. Clipboard auto-clear after copy.
- Registration is open to anyone on the LAN (owner's choice). Rate-limit login/registration.

## Users & devices

- Users register on the web UI: username + master password.
- Each user has one personal vault. (Sharing between users: not in scope for now.)
- Mobile app works **without any account**: local vault with a random vault key protected by biometrics.
- **Pairing (WhatsApp-style)**: logged-in web UI shows QR = `{serverUrl, certFingerprint, oneTimePairingToken (short TTL)}` → phone scans → exchanges token for a long-lived **device token** → user enters master password once on phone to unwrap the user's vault key → local items re-encrypted under it. Device tokens are listed and revocable in the web UI.

## Sync

- Manual only, triggered by user. Server unreachable (off-LAN, timeout ~3s) → friendly message, app keeps working. Never block the UI.
- Each item: `id` (UUID), `version` (int, incremented on change), `updatedAt`, `deleted` (tombstone).
- Sync flow: fetch server item metadata → compare with local → show **"In sync"** or count + list of differing item names (decrypted locally), each tagged `local only` / `server only` / `changed on both` / `deleted on one side`.
- Actions: **Push all**, **Pull all**, or per-item push/pull. Push = server copy overwritten; pull = local copy overwritten. Server rejects a push if its version moved since the diff (optimistic concurrency) → re-diff.

## Server API

Layout: `server/src/Rejtek.Server` (feature folders: `Features/Auth|Devices|Vault`, `Data`, `Security`, `Tls`), tests in `server/tests`. .NET 10 Minimal APIs, EF Core SQLite + migrations (applied on startup), built-in validation, xUnit v3 on Microsoft Testing Platform. Run `dotnet test` / `dotnet format --verify-no-changes` in `server/`.

- `POST /api/auth/prelogin` → salt + KDF params; `POST /api/auth/register`; `POST /api/auth/login` → web session token (12 h) + wrapped vault key; `POST /api/auth/logout`. Rate-limited per IP.
- `POST /api/devices/pairing-tokens` → one-time token (5 min) + cert fingerprint for the QR; `POST /api/devices/pair` (anonymous) → device token (valid until revoked) + salt, KDF params, wrapped vault key; `GET /api/devices`; `DELETE /api/devices/{id}`.
- `GET /api/vault/items`, `GET /api/vault/items/{id}`, `PUT /api/vault/items/{id}` `{baseVersion, updatedAt, data}`, `DELETE /api/vault/items/{id}?baseVersion=n` (tombstone). Version mismatch → `409 {current}`.
- Auth: opaque bearer tokens (`Authorization: Bearer …`); only SHA-256 hashes are stored.
- Deploy: `cp .env.example .env` (set `REJTEK_HOST` to the server's LAN IP/host name), `docker compose up -d` → `https://<host>:8443`. Data (SQLite, certificate) lives in the `rejtek-data` volume; the certificate is created on first start and must not change, or paired devices stop trusting the server.

## Web app

`web/`: Vite + React 19, React Router, TanStack Query (server state), Tailwind v4 (tokens in `src/styles.css`, light/dark via `prefers-color-scheme`). Layout: `app/` (providers, router, shell), `features/<area>/` (pages + hooks), `ui/` (shared components), `lib/`, `session/`. The vault key lives in React state only: reload = sign in again. Inter is self-hosted (no internet dependency on the LAN).

- Dev: `cd server && dotnet run --project src/Rejtek.Server` (http://localhost:5080) + `npm run dev -w @rejtek/web` (proxies `/api`).
- Prod: the Docker build compiles the web app into the server's `wwwroot`; the server serves it with a strict CSP (`script-src 'self' 'wasm-unsafe-eval'`).
- `npm run check` at the repo root runs lint, format check, typecheck and tests for all TS packages.

## Mobile app

`mobile/`: Expo SDK 58 (React Native 0.88, dev build: native libsodium), Expo Router (routes in `src/app/`, everything else outside), TanStack Query, `StyleSheet` + theme tokens (`src/theme`). Always add native deps with `npx expo install`; `android/` is generated (`npx expo run:android`), never edit it.

- Local vault: SQLite (`expo-sqlite`) holds ciphertext only; schema migrations via `PRAGMA user_version`. Local edits bump `version`; unsynced while `version > synced_version`; never-synced deletes are dropped, synced ones become tombstones.
- Vault key: random, in Keystore-backed `expo-secure-store` (this device only). Unlock = system prompt via `expo-local-authentication` (biometric or device PIN/pattern); not biometric-bound, so new fingerprints never make the vault unreadable. A device screen lock is required.
- Auto-lock after 60 s in the background; lock clears decrypted data from memory. Clipboard copies are marked sensitive and cleared after 30 s. Screenshots are blocked in release builds (`FLAG_SECURE`), allowed in dev builds. `allowBackup: false`.
- Accent: Android 12+ Material You system colours via `PlatformColor`, fallback tokens elsewhere.
- Server connection: `modules/pinned-fetch` (local Expo module, Kotlin) trusts exactly the certificate whose SHA-256 came from the pairing QR; hostname is not checked (the pin is the identity). Device token + server URL/fingerprint in SecureStore.
- Pairing: QR / deep link `rejtek://pair?p=<base64url JSON>` → master password once → local items re-encrypted under the account vault key (crash-safe: pending key slot, single transaction, then promote). The web UI must be opened via the server's LAN address, since the QR carries the page origin.
- Sync (`core/src/sync`): diff by id/version/syncedVersion, names decrypted for display only. Push sends the diffed server version as `baseVersion` (409 on concurrent change). Bulk pull/push never delete one-sided items.
- Dev: `npm run android -w @rejtek/mobile` (build + install), `npm start -w @rejtek/mobile` (Metro, never with `CI=1`: that disables reloads). Emulator AVD: `OnePlus_15`; it reaches the host as `10.0.2.2` (e.g. Docker server at `https://10.0.2.2:8443`).

## Firefox extension

`extension/`: Manifest V3 popup (Vite, React, TanStack Query, `@rejtek/ui`), plus a tiny background script for auto-lock. Firefox only for now (`browser.*` APIs, no polyfill).

- Connect: paste the pairing link from the web Pair page (“Copy link for the browser extension”) → host permission requested for that server origin only → paired as a device (`kind: extension`, revocable on the web Devices page).
- Unlock: master password → vault key, offline (salt, KDF params and wrapped key stored at pairing). The vault key lives only in `storage.session` (memory, gone when Firefox closes); auto-lock after 15 minutes without use. `storage.local` holds the connection (incl. device token) and the last encrypted item list for offline use.
- TLS: extensions cannot pin certificates; the user accepts the server's self-signed certificate once in Firefox (compare the fingerprint), after which Firefox trusts exactly that certificate.
- Suggests items for the active tab's site (`activeTab`), copies username/password; clipboard cleared after 30 s while the popup stays open.
- Dev: `npm run build -w @rejtek/extension` → load `extension/dist/manifest.json` via `about:debugging` → This Firefox → Load Temporary Add-on. `npm run lint:ext -w @rejtek/extension` runs Mozilla's web-ext lint; `npm run package -w @rejtek/extension` builds the zip.
- Shared web UI lives in `packages/ui` (components) and `packages/theme` (Tailwind tokens); apps add `@source` for `packages/ui/src`.

## UI

Designs: https://claude.ai/artifact/CY6m995UBCfXgjpNR3vvR6 (pages "Core screens", "Phone screens", "Web screens").

- Light + dark theme, following the system setting.
- Mobile follows OxygenOS/Material 3 idioms: large title, pill search, grouped rounded cards (radius ~22), round FAB, primary actions at the bottom. Accent = Android dynamic color (Material You) where available. Mobile uses the system font; web uses Inter.
- Design tokens (light / dark): background `#F2F3F5` / `#101114`, card `#FFFFFF` / `#1C1D21`, field `#E4E6EA` / `#26282D`, text `#111827` / `#ECEDEF`, muted `#5B6472` / `#9AA0A8`, divider `#ECEEF1` / `#2A2C31`, fallback accent `#2453D4` / `#8AA8FF`, ok `#1F7A4D` / `#4CC38A`, warning `#8A4B00` on `#FDF1DC` / `#F5C16C` on `#3A2A10`, danger `#B42318` / `#FF9B9B`.
- Sync diff tags: changed on both (warning), only on phone (accent), only on server (neutral), deleted on one side (danger).
- Revealed passwords auto-hide after ~30 s. Pairing QR is always dark-on-white, also in dark mode.

## Roadmap

1. ~~`packages/core` crypto + models~~ (done) — verify: unit tests for encrypt/decrypt round-trip, wrong-key and tampering failures, deterministic key derivation.
2. ~~Server + Docker~~ (done) — verify: integration tests for auth, items CRUD, version conflicts; `docker compose up` serves HTTPS.
3. ~~Web UI~~ (done): register, login, vault CRUD, search-as-you-type, reveal, devices, pairing QR.
4. ~~Mobile local vault + biometric unlock~~ (done; verified on the OnePlus_15 emulator: unlock, add/edit/delete, search, reveal auto-hide, dark mode, auto-lock).
5. ~~Pairing + sync~~ (done; verified on the emulator against the Docker server: pairing, push/pull, in sync, offline, certificate change, disconnect).
6. ~~UI design~~ (done, see UI section). Implement screens per the designs within phases 3–5.
7. ~~Firefox extension~~ (done: pair, unlock, search, copy, offline copy). Next: autofill; Chrome later.

## Conventions

- TypeScript strict mode everywhere. C#: nullable enabled.
- Crypto lives **only** in `packages/core`. No ad-hoc crypto elsewhere.
- Keep it simple: minimal dependencies, no features beyond the current phase.
- Current, idiomatic standards for each stack; maintainability first; small, well-separated modules.
- Commit after each milestone (roadmap phase or meaningful sub-step), authored by the repo owner's git identity. No AI co-author/attribution trailers.

## Open questions

- Device token lifetime (default: until revoked).
- Backups of the SQLite volume (ciphertext only, so safe to copy anywhere).
