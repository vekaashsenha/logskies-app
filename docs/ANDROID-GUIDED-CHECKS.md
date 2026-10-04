# Guided Android checks

The user keeps the phone. No remote-control access or physical handover is needed. Ask one check at a time and record outcome, phone model, Android version and installed build. Screenshots are optional; redact credentials and private operational details.

1. Session: close the app completely and reopen. Confirm the expected signed-in account/organization is retained.
2. Logout: sign out and confirm private fleet/history disappears. Reopen and verify sign-in is required.
3. QR: download the battery QR label on web, display/print it, scan from Android and confirm exact battery tag and organization. Do not record a real flight for a test.
4. Permission fallback: deny camera permission and select the battery manually. Confirm the screen explains how to grant permission later.
5. Network failure: disconnect internet, attempt a clearly labeled test preflight and confirm no false saved/synced success. Reconnect and explicitly retry; check no unexpected duplicate.
6. Password recovery: user requests their own reset email, opens the link and chooses a password themselves. Verify the new password on web and Android; never ask them to share password/link.
7. Reports: open web reports on the phone and save a synthetic report as PDF. Confirm logo, page breaks and visible evidence warnings.

Build URLs are in ANDROID-TESTING.md. A submitted build is not a released update. Play Store launch and update delivery require their own release checks.
