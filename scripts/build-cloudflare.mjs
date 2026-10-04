import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// A missing public configuration must fail the deployment instead of silently
// publishing a disconnected workspace. Next loads .env.local for local builds.
let local = '';
try { local = readFileSync(new URL('../apps/web/.env.local', import.meta.url), 'utf8'); } catch {}
for (const name of ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY']) {
  const fileValue = local.match(new RegExp(`^${name}=(.+)$`, 'm'))?.[1]?.trim();
  if (!(process.env[name]?.trim() || fileValue)) {
    console.error(`Missing ${name}: configure it in Cloudflare build variables.`);
    process.exit(1);
  }
}
const result = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['run', 'build:web'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, LOGSKIES_STATIC_EXPORT: '1' },
  });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
