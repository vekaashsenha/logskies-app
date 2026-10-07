# Google sign-in and trial log review

7 October: signup is now two steps. Email details or choosing Google leads to a separate Terms and Conditions screen with privacy links and an unchecked required checkbox. Authentication/account creation starts only after agreement. Email sign-in remains one step. Android Google uses the same second-step structure; native email account creation opens the web signup. This UI consent is not a server-side legal acceptance audit record. Android 1.0.5 (6) requires a new APK.

Web uses /signup and /signin with separate email account modes. Google availability is checked against Supabase's public auth settings. A disabled provider is explicitly described as pending.

Configure a dedicated LogSkies Google Cloud OAuth application using basic account scopes only. Authorized callback: https://eoethmynpnyxfrhjfatj.supabase.co/auth/v1/callback. The account owner must create the OAuth credential and transfer its client ID and secret directly into Supabase's Google provider settings, never into chat or source control. Add logskies://auth/callback to Supabase's redirect allowlist for Android, alongside the existing web destinations. Test both web and Android before announcing Google login availability.

Android 1.0.3 (4) adds a browser OAuth session with PKCE and a callback route. Source changes do not update installed APKs; a new build and physical phone verification are required.

Successful imports retain private originals in the flight-logs Storage bucket and reviews in flight_imports. A project administrator can use the Supabase dashboard to find the organization and source hash, download the matching original and validate it against its saved review. Organization membership does not grant cross-company access. Owner/admin permissions are currently required for imports. Rejected imports are not retained. No automatic review queue or approval is implied. Preserve source files independently.
