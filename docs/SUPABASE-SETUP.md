# Supabase setup for LogSkies

First release: online-only web and Android, sharing one Supabase project.

1. Sign in or create your own account at https://supabase.com/dashboard. Complete any terms acceptance yourself.
2. Create a project named LogSkies in an organization you control. Choose the Mumbai region if available. Select your intended plan; do not enable paid extras unless desired. Enter/store the database password yourself.
3. In SQL Editor, run `supabase/migrations/202610030001_foundation.sql` against the fresh project. Do not run on an existing production database without review.
4. Copy the project URL and publishable key from the Connect dialog. Keep database password and service-role/secret keys out of both apps.
5. Create `apps/web/.env.local` from `.env.example` and `apps/mobile/.env` from `.env.example`. Set both to the same project. Restart both apps.
6. In Supabase Auth URL settings configure the web confirmation redirect for your development origin. Use a deployed HTTPS origin for production. Keep email confirmation enabled.
7. Open `/workspace` on web. Create and confirm an application account. Sign in, create an organization, add a battery and drone, and download the QR label.
8. Sign in as your own application user on Android. Scan the QR, select the drone, and save an online session. Refresh web to confirm the shared record.
9. Upload your company logo in the web workspace and inspect the branded draft report via Print / Save PDF.

Before production, test separate users/organizations, pilot write restrictions, membership escalation attempts, foreign-organization asset references and storage isolation. Invitation management, telemetry processing and regulatory report verification remain pending.

## Current setup — 3 October 2026

The `logskies-app` project has been created in Tokyo (`ap-northeast-1`) and the foundation migration applied successfully. All eight public tables have RLS enabled; `company-logos` and `flight-logs` buckets are private. Both local apps are configured with the same project URL and publishable key in ignored environment files. No database password or privileged server key is included in either app.

Hosted REST checks confirm anonymous reads return no records across all eight tables, anonymous organization creation is denied, and private buckets are not listed anonymously. Email login is enabled with email confirmation required. Local web signup returns to `http://localhost:3000/workspace`, which is allow-listed. Production hosting must supply its own environment configuration and exact HTTPS redirect URL.

Run `node scripts/check-supabase.mjs` from the repository root to repeat the endpoint checks (network access required). It does not create users or print keys. Create and confirm an application account via `/workspace` to continue authenticated organization/fleet/private-logo and Android device tests. The Supabase dashboard account is separate from the LogSkies application account.

Flight import and report history in `/dashboard` still remain browser-local. Configuring Supabase activates the existing shared fleet/preflight workspace; it does not automatically move those flight records to the cloud.

## Authenticated verification — 4 October 2026

The application account is confirmed and signed in. The user's `DRONE Farm` organization loads successfully. Clearly labelled synthetic battery and drone records and one preflight association were saved through the connected workspace and persisted after a full reload, along with the authenticated session. Screenshot: `qa/supabase-authenticated-workspace.png`.

The user's company logo is stored privately and loads in the workspace report after reload. Hosted transactional owner/pilot/outsider SQL checks passed on 4 October, with all fixtures rolled back; see `scripts/verify-hosted-rls.sql`. Android device/cross-device and separate real-user browser verification remain pending.

The early-access web application is deployed to `https://logskies-app.pages.dev`. Supabase Site URL is set to this origin and the exact `/workspace` confirmation redirect is allow-listed alongside local development. Custom-domain configuration is pending DNS activation.

## Shared imported flight records
Apply migrations/202610040001_flight_imports.sql after the foundation. flight_imports holds imported drafts separately from trusted service-generated flight_logs. Members can read; only organization admins can use save_flight_imports. Original logs remain in the private flight-logs bucket at organization/source-hash/source. An interrupted metadata save can leave an orphan source; retry the same file to recover. Do not promote these records to certified flight evidence automatically.

