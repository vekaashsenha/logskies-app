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

The app is not currently connected to a hosted Supabase project. The migration is drafted but not yet executed or integration-tested.
