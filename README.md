# LogSkies

Web and Android foundations for drone fleet battery tracking and flight records.

## Run locally

From the repository root:

- `npm install`
- `npm run dev:web` — http://localhost:3000
- `npm run dev:android` — Android emulator or connected development device
- `npm run start --workspace=@logskies/mobile` — Expo development server
- `npm test`
- `npm run lint`
- `npm run build:web`
- `npm run typecheck:mobile`
- `npm run lint --workspace=@logskies/mobile`

## Available now

### Web

`/` is the public homepage; `/solutions`, `/features`, `/pricing`, `/faq`, and `/contact` share its design. `/dashboard` includes local battery inventory, preflight sessions, company settings, supported DataFlash/MAVLink import, battery matching and qualified health estimates. Flight originals, observations and reviews persist in IndexedDB in this browser. Branded draft reports include UTC/IST times, coordinates, evidence checks, CSV/JSON export and Print / Save PDF. See [flight processing](docs/FLIGHT-PROCESSING.md).

`/workspace` is the Supabase-connected implementation: email signup/login, organization creation, battery/drone registration, downloadable QR labels, shared preflight records and private logo uploads for branded draft reports. It requires project configuration and the applied migration.

### Android

Without Supabase configuration, the app displays a demo fleet with QR/manual identification and persistent device-local session history. With configuration, it supplies email login, organization selection, shared fleet loading, QR/manual battery identification and online preflight recording. Navigation uses Expo Router.

First release is online-only. Device-local demo history is not offline synchronization. Camera scanning still requires real device testing.

### Shared and database

Shared packages provide domain types, conservative missing-telemetry behavior, unambiguous timestamp matching, CSV escaping and Supabase fleet operations.

The foundation migration provides organization bootstrap, membership RLS, organization-consistent asset foreign keys and private storage buckets. It is now applied to the hosted project. Embedded PostgreSQL isolation tests and hosted anonymous REST/Auth/Storage checks pass; authenticated user and cross-device validation still require application sign-in.

## Connect Supabase

See [setup instructions](docs/SUPABASE-SETUP.md). Use the same project for both apps. Create `apps/web/.env.local` and `apps/mobile/.env` from their example files. Only the project URL and publishable key belong in the clients; keep database passwords and service-role/secret keys out of the apps.

First connected milestone: create your organization/battery/drone on web, scan the downloaded battery QR on Android, save an online preflight session and refresh web to see it.

## Still required for the complete MVP

- Authenticated hosted organization/role/storage isolation and cross-device tests. Project setup, schema execution and anonymous endpoint checks are complete.
- Team invitations and membership administration.
- Shared cloud flight storage, server processing/background jobs and Android flight report access. Current processing and flight history are browser-local.
- Validation against customer telemetry, calibrated battery baselines and retirement workflow.
- Verified DGCA export templates, authoritative airspace data, route/altitude/pilot checks and reviewer approval.
- Server-generated PDF/Excel and Android report download. Current web PDF uses browser Print / Save PDF; local flight CSV and preflight CSV are available.
- Subscriptions, production deployment, Android device tests, release icons and Play Store preparation.

Reports are deliberately marked draft/unverified. This increment does not establish airworthiness or DGCA compliance.

## Checks and limitations

Domain tests, web lint/build and mobile TypeScript/bundle checks are run during development; see `docs/VALIDATION.md` for the latest results.

The initial dependency audit reports advisories in Expo/Metro and development tooling. Resolve these before a production release. Do not use `npm audit fix --force` to downgrade the Expo SDK blindly.

The Android launcher assets still come from the Expo template. The QA company logo is a test fixture, not the user's company logo.

## Layout

- `apps/web`: Next.js
- `apps/mobile`: Expo / React Native / Expo Router
- `packages/domain`: types and rules
- `packages/api`: shared Supabase operations
- `supabase/migrations`: database foundation
- `docs`: setup and validation notes

## Visual direction update

The public site and application styling now follow the user's DroneLogbook reference: charcoal navigation, green hero sections, a white canvas, restrained shadows and spacious cards. LogSkies copy, original vector illustrations and identity are retained.

Public routes: `/`, `/solutions`, `/features`, `/pricing`, `/faq`, `/contact`. The local fleet demo is now at `/dashboard`; the connected app remains at `/workspace`. The contact form prepares an inquiry draft with copy/download options and does not send it. Pricing is explicitly proposed.
