import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseLog, type BatterySample } from "./index.ts";
import { estimateHealth, type HealthInputs } from "./health.ts";
import { initialReview, reviewChecks } from "./compliance.ts";
const read = (file: string) => {
  const b = fs.readFileSync("docs/fixtures/" + file);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
test("DataFlash FMT decoding preserves units, UTC, interval and separate battery channels", () => {
  const parsed = parseLog(read("synthetic-flight.bin"), "synthetic-flight.bin");
  const f = parsed.flights[0];
  assert.equal(parsed.format, "DataFlash");
  assert.equal(f.boundary, "armed interval");
  assert.equal(f.durationMinutes, 2);
  assert.equal(f.startUtc, "2026-10-01T08:00:01.000Z");
  assert.equal(f.endUtc, "2026-10-01T08:02:01.000Z");
  assert.equal(f.route[0].lat, 18.52043);
  assert.equal(f.maxRelativeAltitude, 96);
  assert.deepEqual([...new Set(f.batteries.map((s) => s.instance))], [0, 1]);
});
test("Timestamped MAVLink v1 log uses capture UTC and correct packet offsets", () => {
  const parsed = parseLog(
    read("synthetic-flight.tlog"),
    "synthetic-flight.tlog",
  );
  const f = parsed.flights[0];
  assert.equal(parsed.systemId, 1);
  assert.equal(f.durationMinutes, 2);
  assert.equal(f.startUtc, "2026-10-01T08:00:01.000Z");
  assert.equal(f.maxRelativeAltitude, 98);
  assert.equal(f.batteries[0].voltage, 24);
  assert.equal(f.batteries[0].current, 20);
});
test("CRC corruption is rejected rather than silently treated as telemetry", () => {
  const bytes = new Uint8Array(read("synthetic-flight.tlog"));
  bytes[8 + 6 + 6] ^= 1;
  const parsed = parseLog(bytes.buffer, "bad.tlog");
  assert.ok(parsed.warnings.some((w) => w.includes("CRC-invalid")));
  // The rejected packet was the only preceding disarmed heartbeat.
  assert.equal(parsed.flights[0].complete, false);
});
test("Arbitrary file, zero length and oversized logs are rejected", () => {
  assert.throws(() => parseLog(new ArrayBuffer(0), "a.bin"));
  assert.throws(() => parseLog(new ArrayBuffer(10), "a.exe"));
  assert.throws(() => parseLog(new ArrayBuffer(10), "a.bin"));
  assert.throws(() => parseLog(new ArrayBuffer(50 * 1024 * 1024 + 1), "a.bin"));
});
const inputs: HealthInputs = {
  ratedMah: 16000,
  cycles: 100,
  instance: 0,
  baselineResistanceOhms: 0.025,
  expectedDeliveredMah: 12000,
  capacityTestConfirmed: false,
  comparableConditionsConfirmed: false,
};
test("Partial-flight throughput never becomes full capacity health without qualification", () => {
  const f = parseLog(read("synthetic-flight.bin"), "a.bin").flights[0];
  const h = estimateHealth(f.batteries, inputs);
  assert.equal(h.health, null);
  assert.equal(h.consumedMah, 11900);
  assert.equal(h.cycleScore, 85);
  assert.ok(h.burstCount >= 3);
  const qualified = estimateHealth(f.batteries, {
    ...inputs,
    capacityTestConfirmed: true,
    comparableConditionsConfirmed: true,
  });
  assert.equal(qualified.resistanceOhms, 0.025);
  assert.equal(qualified.health, 95.92);
  const second = estimateHealth(f.batteries, { ...inputs, instance: 1 });
  assert.equal(second.consumedMah, 5950);
});
test("Counter resets and missing capacity/current prevent a confident estimate", () => {
  const samples: BatterySample[] = [
    { t: 1, instance: 0, voltage: 25, current: null, consumed: 100, cells: [] },
    { t: 2, instance: 0, voltage: 24, current: null, consumed: 0, cells: [] },
  ];
  const h = estimateHealth(samples, {
    ...inputs,
    capacityTestConfirmed: true,
    comparableConditionsConfirmed: true,
  });
  assert.equal(h.health, null);
  assert.equal(h.consumedMah, null);
});
test("Missing evidence cannot pass audit review; expired RPC and exceeded AGL fail", () => {
  const f = parseLog(read("synthetic-flight.bin"), "a.bin").flights[0];
  const review = initialReview(f);
  const missing = reviewChecks(f, review);
  assert.equal(
    missing.find((c) => c.name === "Mission & incident record")?.state,
    "pending",
  );
  assert.ok(
    missing.some(
      (c) => c.name === "Height above ground" && c.state === "pending",
    ),
  );
  assert.ok(
    missing.some(
      (c) => c.name === "Official export format" && c.state === "pending",
    ),
  );
  const checks = reviewChecks(f, {
    ...review,
    pilotName: "Test",
    pilotRpc: "TEST-RPC",
    rpcIssuedOn: "2020-01-01",
    rpcExpiresOn: "2025-12-31",
    verifiedAglMeters: 121,
    applicableCeiling: 120,
    altitudeEvidence: "TEST",
  });
  assert.equal(
    checks.find((c) => c.name === "Pilot credentials")?.state,
    "fail",
  );
  assert.equal(
    checks.find((c) => c.name === "Height above ground")?.state,
    "fail",
  );
});
test("Independent public ArduPilot log decodes and preserves missing-data warnings", () => {
  const file = "ArduCopter-AHRSAutoTrim-00000322.BIN";
  if (!fs.existsSync("docs/fixtures/" + file)) return;
  const parsed = parseLog(read(file), file);
  assert.ok(parsed.messages > 1000);
  assert.ok(parsed.flights[0].batteries.length > 0);
  assert.equal(parsed.flights[0].startUtc, null);
  assert.equal(
    estimateHealth(parsed.flights[0].batteries, inputs).health,
    null,
  );
});
