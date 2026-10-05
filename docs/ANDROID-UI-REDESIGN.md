# Android field workflow redesign — 5 October 2026

Five Expo Router tabs replace the single long screen: Home, Fleet, Scan, Flights and More. White cards, restrained green accents, safe-area spacing, readable type and named controls use one shared component set. Narrow phone layouts and wide/folded layouts use the same navigation; content has a readable maximum width.

- Home presents a preflight action, counts for the loaded records, recent imported intervals and reminders for missing airspace/occurrence entries. Counts are not lifetime totals, and reminders do not prove compliance.
- Fleet has separate searchable drone/battery lists and details on demand. Add/edit/QR-label actions open the shared website; native asset editing is not claimed.
- Scan guides drone selection, battery QR/manual selection, review and online save. The selected battery time is preserved during review. Camera unmounts on tab blur/background. Missing camera access explains manual selection.
- Flights separates imported intervals and preflight associations. Search and a separate detail route expose summaries without long inline forms. Full telemetry/evidence/PDF workflows remain on web.
- More holds organization selection, company/report links, support/privacy/legal/deletion links and sign-out. Protected routes leave private screens when signed out; data clears on organization/account changes.

Data uses the existing Supabase API, tenant policies and private storage. No migration or new permissions. A save success is shown only after the existing server write returns. Refresh is separate from save to avoid retrying an acknowledged write. The same event identifier is retained for retries; server uniqueness rejects duplicate submissions. A timeout or lost response may still require refreshing session history before retrying.

Browser visual QA uses the actual React Native screens rendered with react-native-web. `EXPO_PUBLIC_UI_PREVIEW=1` is effective only in development, on web: clearly labeled example records, no Supabase calls, in-memory saves. It is inactive in release Android builds and is not enabled in EAS. Browser preview is not physical-device validation.

User's Samsung Fold 5 / Android 16: camera grant/deny, real-account persistence, cross-platform saves, network failure, accessibility/font scaling and fold/unfold checks remain required on the installed new APK. Launcher assets, Play Store release and payment work remain separate.

Version 1.0.1, Android versionCode 2 identifies this redesign. Verification: mobile TypeScript and full mobile ESLint (including provider), web ESLint, 27 shared/security tests, Android release JS export and Cloudflare static build pass. Browser UI checks at 390×844 and 768×900 cover tabs, battery search/empty state, invalid identifier, manual three-step preflight save, session history and flight detail navigation. The dependency install still reports advisories; a full dependency security remediation review remains a prelaunch task.
