// Run after `npx eas-cli@latest login`. Only public client configuration is sent.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
const env = fs.readFileSync("apps/mobile/.env", "utf8");
const cli = process.env.LOGSKIES_EAS_CLI;
if (!cli) throw new Error("Set LOGSKIES_EAS_CLI to the official installed EAS CLI entry point.");
for (const name of ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]) {
  const value = env.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1]?.trim().replace(/^['"]|['"]$/g, "");
  if (!value || (name.endsWith("KEY") && !value.startsWith("sb_publishable_"))) throw new Error(`Missing or unsafe public configuration: ${name}`);
  const result = spawnSync(process.execPath, [cli,"env:set","preview","--name",name,"--value",value,"--visibility","plaintext","--scope","project","--non-interactive"], {cwd:"apps/mobile",encoding:"utf8"});
  if (result.status !== 0) throw new Error(`EAS public configuration failed for ${name}. Check login and project permissions.`);
  console.log(`Configured ${name} for the Android preview build.`);
}
