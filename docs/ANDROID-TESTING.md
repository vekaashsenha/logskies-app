# Android preview validation

Expo project: `@vekaashsenhas-team/logskies`, ID `663836c4-bbbd-46e8-9519-609afdeef598`.
Build profile: `preview`, internal APK, public Supabase configuration in the project preview environment. Never put privileged server keys or signing credentials in source control. Production environment configuration is deliberately separate.

Initial build: https://expo.dev/accounts/vekaashsenhas-team/projects/logskies/builds/402c89c6-9c4d-410f-a0e4-e0a316310af0

Next preview from commit 69f64d4: https://expo.dev/accounts/vekaashsenhas-team/projects/logskies/builds/2c095009-0f40-47a8-a519-e0b973d62fca . FINISHED status verified on 4 October 2026. Includes reset-email action, web account-creation and current FAQ links. APK: https://expo.dev/artifacts/eas/nbH0bDBUTJ3ZFjMrQBab86kuhldTA7EGVPsYXuqPy2I.apk . Installation and recovery testing on the user's device remain pending.

Build status verified FINISHED on 4 October 2026. APK: https://expo.dev/artifacts/eas/I5Yfrg-Iqw1NU1sFWN7UPxzzTBFcaJguIj2KI_uzbbQ.apk

TypeScript and Expo lint pass. The user confirmed successful Android sign-in, web preflight synchronization, shared flight-history access and opening web reports on 4 October 2026. Phone model/Android version, camera QR scanning, session persistence/logout and network-failure behavior still need verification.

## Device checks

Legal/support-link preview submitted from commit 30837a0: https://expo.dev/accounts/vekaashsenhas-team/projects/logskies/builds/cc83580b-3967-4269-96a9-52793e452ff9 . Build completion and installation are pending; includes support/privacy email, Terms, Privacy Policy and account-deletion request links.

1. Download the completed preview APK from the Expo build page and install it on a test Android phone. Record model and Android version. Internal distribution does not publish to Google Play.
2. Sign in using the same confirmed LogSkies app account used on web. Confirm the expected organization, drone and battery load; another organization's data must not appear.
3. Download a battery QR from the web workspace. Grant camera access on the phone, scan that QR and confirm the exact physical pack label. Deny camera access once and check manual selection still works.
4. Select the correct drone and save a preflight. Refresh the web fleet/preflight records and verify the same pack, drone and timestamp. A preflight is not a confirmed takeoff.
5. Refresh shared flight history on the phone and check the uploaded web flight summary. Open web reports; sign into the browser separately if required. Native PDF download and native log parsing are not implemented in this preview.
6. Close and reopen the app; verify account persistence. Sign out and verify fleet, flight and preflight information disappears. Switch organizations and verify stale records disappear.
7. Disconnect the network and attempt a save: the app must report failure, not claim a synchronized record. This release is online-only.

## Pending production work

Physical device tests, customer telemetry validation, launcher branding, signed release/AAB verification and Play Store listing/privacy review remain pending. The current weighted battery health model is not an airworthiness certification. Reports are Flight Operations Reports with visible evidence gaps, not DGCA-approved forms.

Build configuration: `apps/mobile/eas.json`. Start a preview after official CLI login with `npx eas-cli@latest build --platform android --profile preview`. Use the project preview variables; `.env` is for local development.
