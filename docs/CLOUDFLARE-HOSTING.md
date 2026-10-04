# Cloudflare hosting

The current web application supports a Next.js static export. Supabase authentication, fleet data and private logo retrieval run in the browser. Cloudflare Pages serves the exported assets. Cloud flight processing and server-generated reports require a separately deployed backend in a later increment.

## Git deployment

- Repository: `vekaashsenha/logskies-app`, branch `main`.
- Root directory: repository root (leave blank), because this is an npm workspace monorepo.
- Build command: `npm run build:cloudflare`.
- Output directory: `apps/web/out`.
- Build environment: Node.js 22, `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the existing project. Never provide database passwords or service-role keys.
- Leave payment variables empty until payment setup resumes.

The build fails if Supabase public configuration is missing. `NEXT_PUBLIC_` values are embedded at build time; changing them requires a rebuild. The static build disables the Next image optimizer and includes Pages `_headers` for frame blocking, MIME sniffing protection, referrer policy and restricted browser permissions.

After deployment, add the actual HTTPS `/workspace` URL to Supabase Auth redirect allow-list and set the intended production Site URL. Add `logskies.com` as a Pages custom domain through the dashboard; inspect existing DNS before modifying it. A domain outside this Cloudflare account requires the owner's DNS access. Do not allow all preview domains as authentication redirects.

## Release verification

Check direct navigation/reload on `/workspace`, `/solutions`, `/faq` and knowledge articles; signup confirmation and login; organization data and private company logo after reload; page width on mobile; file downloads and Print / Save PDF. Test a separate user and organization against the hosted policies before unrestricted customer onboarding.

Local checks on 4 October 2026: static production export succeeds (18 generated pages); all 15 domain/telemetry/PostgreSQL policy tests pass. Authenticated web fleet/preflight persistence and the user's company logo loading after reload are verified.

The npm web advisory scan reports `braces` and its dependent `micromatch`. The registry's current braces release is 3.0.3, still within the advisory range; no safe patched release was available during this check. The observed web dependency path is lint tooling (`eslint-config-next` → `fast-glob`), not shipped application code. Static hosting has no Node request-time execution. Keep tracking upstream fixes; this is not a claim that the full monorepo audit is clean.

References: [Cloudflare static Next.js guide](https://developers.cloudflare.com/pages/framework-guides/nextjs/deploy-a-static-nextjs-site/), bundled Next.js static export documentation.
