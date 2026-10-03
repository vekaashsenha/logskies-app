import fs from "node:fs";
import assert from "node:assert/strict";
const readEnv = (path) =>
  Object.fromEntries(
    fs
      .readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const i = line.indexOf("=");
        return [line.slice(0, i), line.slice(i + 1)];
      }),
  );
const web = readEnv("apps/web/.env.local");
const mobile = readEnv("apps/mobile/.env");
const url = web.NEXT_PUBLIC_SUPABASE_URL;
const key = web.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.equal(url, mobile.EXPO_PUBLIC_SUPABASE_URL);
assert.equal(key, mobile.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
assert.ok(key.startsWith("sb_publishable_"));
assert.ok(/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url));
async function request(path, options = {}) {
  const response = await fetch(url + path, {
    ...options,
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  return { status: response.status, body: await response.json() };
}
for (const table of [
  "organizations",
  "organization_members",
  "batteries",
  "drones",
  "pilot_profiles",
  "preflight_sessions",
  "flight_logs",
  "battery_observations",
]) {
  const result = await request("/rest/v1/" + table + "?select=*&limit=1");
  assert.equal(result.status, 200, table + " REST endpoint unavailable");
  assert.deepEqual(result.body, [], table + " exposed anonymous records");
  console.log("PASS anonymous read returns no records: " + table);
}
const bootstrap = await request("/rest/v1/rpc/create_organization", {
  method: "POST",
  body: JSON.stringify({ org_name: "Anonymous access probe" }),
});
assert.ok(
  [401, 403].includes(bootstrap.status),
  "Anonymous organization creation was not denied",
);
console.log("PASS anonymous organization creation denied");
const buckets = await request("/storage/v1/bucket");
assert.equal(buckets.status, 200);
assert.deepEqual(buckets.body, [], "Private buckets exposed anonymously");
console.log("PASS no anonymous bucket listing");
const auth = await request("/auth/v1/settings");
assert.equal(auth.status, 200);
assert.equal(auth.body.external.email, true, "Email login is disabled");
assert.equal(
  auth.body.mailer_autoconfirm,
  false,
  "Email confirmation must remain enabled",
);
console.log("PASS email login enabled with confirmation required");
console.log(
  "Both apps target the same hosted project. Authenticated user/device tests require user sign-in.",
);
