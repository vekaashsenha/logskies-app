# Validation — 3 October 2026

Passed:

- Marketing content refresh: removed integration abbreviation tiles, updated compatibility/FAQ/features/pricing/privacy copy to match local capabilities, and verified the shared CTA kicker is white on its darker green background. FAQ expansion and 390 px layout checked; web lint and production build passed.

- Combined automated tests: 15/15 (domain, telemetry, health, airspace geometry and PostgreSQL migration isolation).
- Web ESLint: no errors or warnings.
- Android TypeScript check: passed.
- Android Expo lint: passed.
- Next.js production build: passed, including `/` and `/workspace`.
- Expo Android bundle export: passed after Expo Router setup and dependency alignment.
- Expo Doctor: 21/21 checks passed after resolving duplicate React and native animation packages.
- Browser checks: battery creation, preflight session recording, company name, test logo upload and branded report preview.
- Local DataFlash import: 366 supported records, two battery channels, 120-second interval; review persisted after reload and appeared under Reports with the test company logo.
- Narrow flight report viewport: 319 px with 304 px document width; no page-width overflow. CSV payload/link inspected, but the in-app browser did not return a download-completion event. File download completion in Chrome/Edge remains to be checked.
- Narrow web viewport: checked at 390 px; no page-width overflow observed.

Not verified:

- Hosted Supabase migration execution, real authentication, cross-device records and Storage endpoints. Local PostgreSQL isolation tests passed; hosted integration still needs configuration.
- Camera scanning/native permissions on an Android device; bundle export is not an APK/device test.
- Actual PDF pagination and hosted report generation.
- Independent customer MAVLink logs, real battery calibration, and hosted shared flight processing.
- DGCA template acceptance, current route airspace evaluation and audit evidence completeness.

Dependency diagnostic:

Expo Doctor initially reported duplicate React and animation module versions. These were aligned with Expo SDK 57; the final diagnostic passed all 21 checks. Web and Android builds passed afterward. A separate online advisory review timed out during automatic permission approval. Previous npm installs reported transitive advisories; a complete current online audit remains necessary before release. An offline audit result was discarded because it could not establish current advisory status.

All application changes are local and have not been pushed to GitHub. Company branding in the QA screenshot uses a deliberately labeled test logo.


## Reference design update

The user's reference was inspected visually: charcoal header, green introduction, white content cards and generous spacing. The updated LogSkies design applies this direction to the public site, dashboard, connected workspace, reports and Android styles.

Public pages: Home, Solutions, Features, Pricing, FAQ and Contact. The local demo moved to `/dashboard`. Contact downloads an unsent inquiry; pricing is proposed. Web build, web/mobile lint and mobile TypeScript checks passed after the update.

Responsive checks: mobile menu opens/closes on navigation; FAQ expands; page width stays within the 390 px viewport. Existing company logo and preflight records remain visible at `/dashboard`. The contact flow prepares a visible, unsent draft with copy/download options; download completion is not asserted without browser confirmation.

## Photographic UI update — 2026-10-03

- Replaced all six service illustrations with original imagegen photographs saved in apps/web/public/images/industries; prompt set and provenance in IMAGE-ASSETS.md.
- Applied white navigation, #74A836 CTA accents, #F8F9FA alternate surfaces and charcoal text across web routes.
- Added accessible industry tabs, native QR preview dialog, two-second sample log parsing, demo CSV link, monthly/annual pricing and feature matrix.
- Added integration roadmap, compliance preparation page, knowledge hub with three source-linked guides, and prototype privacy disclosure.
- Contact draft includes fleet size and autopilot; verified draft remains local and explicitly unsent.
- Passed web ESLint and production build (18 generated pages). All 15 public/workspace/demo routes checked return HTTP 200.
- Browser QA: six service photos loaded; mining and powerline tabs update content; six-cell QR modal opens/closes; sample parser displays 28 min / 98 m AGL / 21.6 V and enables draft manifest; annual pricing gives 20% discount; mobile menu and online-only FAQ work.
- Responsive check at 390 px: document scroll width 375 px, no horizontal page overflow. Desktop checked at 1280 px.
- Screenshot: qa/photographic-home.png.
- This update does not connect production telemetry, billing or DGCA/eGCA verification. Company-branded report drafts and existing workspace flows remain available. No GitHub push or deployment performed.
