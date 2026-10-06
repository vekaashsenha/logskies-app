import test from "node:test";
import assert from "node:assert/strict";
import {
  googleSignInEnabled,
  beginGoogleSignIn,
  requestPasswordReset,
  savePilot,
  renameOrg,
  type SupabaseClient,
} from "./index.ts";

test("Google availability respects provider settings and rejects failed settings requests", async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const enabled of [true, false]) {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ external: { google: enabled } }));
      assert.equal(
        await googleSignInEnabled("https://example.test", "public-test-key"),
        enabled,
      );
    }
    globalThis.fetch = async () => new Response("unavailable", { status: 503 });
    await assert.rejects(
      googleSignInEnabled("https://example.test", "public-test-key"),
      /availability/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Google login preserves redirect and native browser handoff and propagates provider errors", async () => {
  let options: unknown;
  const client = {
    auth: {
      signInWithOAuth: async (input: unknown) => {
        options = input;
        return {
          data: { url: "https://accounts.google.com/test" },
          error: null,
        };
      },
    },
  } as unknown as SupabaseClient;
  assert.equal(
    await beginGoogleSignIn(client, "logskies://auth/callback", true),
    "https://accounts.google.com/test",
  );
  assert.deepEqual(options, {
    provider: "google",
    options: {
      redirectTo: "logskies://auth/callback",
      skipBrowserRedirect: true,
      queryParams: { prompt: "select_account" },
    },
  });
  client.auth.signInWithOAuth = async () =>
    ({
      data: { provider: "google", url: null },
      error: new Error("Provider disabled"),
    }) as never;
  await assert.rejects(
    beginGoogleSignIn(client, "https://logskies.com/workspace"),
    /Provider disabled/,
  );
});

test("Profile inputs reject invalid calendar dates and empty names before database writes", async () => {
  const client = {
    from: () => {
      throw new Error("Unexpected database request");
    },
  } as unknown as SupabaseClient;
  for (const date of ["2026-02-30", "2025-02-29", "12/31/2030", "invalid"]) {
    await assert.rejects(
      savePilot(client, "org", {
        display_name: "Pilot",
        rpc_number: "RPC-1",
        rpc_expires_on: date,
      }),
      /valid expiry/,
    );
  }
  await assert.rejects(
    savePilot(client, "org", {
      display_name: "  ",
      rpc_number: "",
      rpc_expires_on: "",
    }),
    /pilot name/,
  );
  await assert.rejects(renameOrg(client, "org", " "), /company name/);
});

test("Password reset validates email before any request and preserves configured recovery destination", async () => {
  const calls: unknown[] = [];
  const client = {
    auth: {
      resetPasswordForEmail: async (...args: unknown[]) => {
        calls.push(args);
        return { error: null };
      },
    },
  } as unknown as SupabaseClient;
  await assert.rejects(
    requestPasswordReset(client, "invalid", "https://logskies.com/workspace"),
    /valid email/,
  );
  assert.equal(calls.length, 0);
  await requestPasswordReset(
    client,
    " operator@example.com ",
    "https://logskies.com/workspace",
  );
  assert.deepEqual(calls, [
    ["operator@example.com", { redirectTo: "https://logskies.com/workspace" }],
  ]);
  const failed = {
    auth: {
      resetPasswordForEmail: async () => ({ error: new Error("Rate limited") }),
    },
  } as unknown as SupabaseClient;
  await assert.rejects(
    requestPasswordReset(
      failed,
      "operator@example.com",
      "https://logskies.com/workspace",
    ),
    /Rate limited/,
  );
});
