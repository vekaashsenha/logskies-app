import test from "node:test";
import assert from "node:assert/strict";
import { requestPasswordReset, type SupabaseClient } from "./index.ts";

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
