import test from "node:test";
import assert from "node:assert/strict";
import {
  requestPasswordReset,
  savePilot,
  renameOrg,
  type SupabaseClient,
} from "./index.ts";

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
