# Web and Android release consistency

For every feature change, review shared API/domain logic, web workspace, Android screens, report wording, marketing/solutions, integrations, FAQ, privacy and validation documents. Update each affected surface in the same change. Do not claim a feature is released on a platform until its artifact is available.

Shared fleet, preflight and flight-history data use the same Supabase organization records. Web imports and evidence review generate Flight Operations Reports; Android opens those web reports. Native log parsing and PDF generation are not implemented.

Website changes deploy through GitHub/Cloudflare. Native Android changes require a new EAS preview APK and installation; an already-installed APK is not automatically changed by a website deployment.

Current password-recovery change: a shared reset-email helper is used by both clients; recovery emails open the existing allowed /workspace web URL, and the new password works for the same account on both platforms. Android now provides account-creation and current FAQ links. User-controlled email and password verification remains pending.
