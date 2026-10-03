import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateHealth,
  matchSession,
  parseBatteryQr,
  csvCell,
} from "./index.ts";
test("missing telemetry cannot create a healthy estimate", () => {
  assert.equal(
    calculateHealth({ capacity: null, sag: 100, cycles: 100 }),
    null,
  );
  assert.equal(calculateHealth({ capacity: 100, sag: 100, cycles: 100 }), 100);
  assert.equal(calculateHealth({ capacity: 101, sag: 100, cycles: 100 }), null);
});
test("matching rejects future scans, expired sessions and ambiguity", () => {
  const session = {
    id: "1",
    batteryId: "b",
    droneId: "d",
    scannedAt: "2026-10-03T08:00:00Z",
  };
  assert.equal(matchSession([session], "d", "2026-10-03T08:10:00Z")?.id, "1");
  assert.equal(matchSession([session], "d", "2026-10-03T07:59:00Z"), null);
  assert.equal(matchSession([session], "d", "2026-10-03T08:30:00Z"), null);
  assert.equal(matchSession([session], "other", "2026-10-03T08:10:00Z"), null);
  assert.equal(
    matchSession(
      [session, { ...session, id: "2" }],
      "d",
      "2026-10-03T08:10:00Z",
    ),
    null,
  );
});
test("QR identifiers and CSV values reject unsafe input", () => {
  assert.equal(
    parseBatteryQr("logskies:battery:demo-battery-01"),
    "demo-battery-01",
  );
  assert.equal(parseBatteryQr("https://untrusted.example"), null);
  assert.equal(csvCell("=1+1"), '"\'=1+1"');
  assert.equal(csvCell('a"b'), '"a""b"');
});
