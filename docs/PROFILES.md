# Shared company and pilot profiles

6 October update: web company forms and pilot profiles are hidden behind the Profile button. Company creation is first-time setup only. Existing multiple memberships are preserved and can be selected within Profile. Both clients use a five-profile creation limit, while existing profiles remain editable. Migration 202610060001 adds atomic database enforcement; until deployed the client limit cannot prevent direct or concurrent inserts. No existing records are deleted. Android updates need a new APK.

Web workspace exposes company display name, existing private report-logo upload, and pilot creation/editing. Android 1.0.2 (version code 3) adds More → Company & pilot profiles, with company-name editing and pilot creation/editing. Android logo management opens the web workspace. Both platforms use existing organizations and pilot_profiles tables, with no migration or widened permissions.

Members can read profiles. Owners/admins can edit; database RLS remains authoritative. Pilot records are operational records, not user accounts or invitations. Names, RPC numbers and expiry dates are entered data, not regulator verification. Expiry supports an empty setup value; complete credentials must be verified before relying on reports. No certificate uploads are introduced.

On web, a flight reviewer can select a profile to copy its name, RPC and expiry into the current review. The issue date is cleared to prevent mixing credentials from different pilots. Reviewers enter the issue date and verify the certificate. Existing saved reviews are not automatically rewritten by pilot-profile edits. Report headers use the current company name/logo, as before.

Remaining: company legal address/GST/contact metadata, pilot-issued date and certificate evidence, authenticated pilot self-profile linkage, invitations, selection of a pilot during preflight, and physical-device validation. Native updates require a newly installed APK; the previous 1.0.1 build does not contain profiles.

Validation: web lint/production Cloudflare build, Android lint/typecheck/Hermes bundle export, and 28 automated tests including invalid calendar dates and PostgreSQL tenant/role isolation. Authenticated hosted profile creation/editing and physical Android interaction have not been tested yet.
