import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseLog } from "./index.ts";
function message(type: string, payload: Uint8Array | string) {
  const data = typeof payload === "string" ? Buffer.from(payload) : payload;
  const b = Buffer.alloc(3 + data.length);
  b.writeUInt16LE(data.length);
  b[2] = type.charCodeAt(0);
  b.set(data, 3);
  return b;
}
function synthetic({
  reset = false,
  truncated = false,
  incompatible = false,
  dropout = false,
  missing = false,
} = {}) {
  const header = Buffer.alloc(16);
  header.set([0x55, 0x4c, 0x6f, 0x67, 1, 0x12, 0x35, 1]);
  header.writeBigUInt64LE(1000000n, 8);
  const flags = Buffer.alloc(40);
  if (incompatible) flags[8] = 1;
  const out = [header, message("B", flags)];
  const definitions = [
    "actuator_armed:uint64_t timestamp;bool armed;uint8_t[3] _padding0;",
    "vehicle_gps_position:uint64_t timestamp;uint64_t time_utc_usec;int32_t lat;int32_t lon;int32_t alt;uint8_t fix_type;",
    "battery_status:uint64_t timestamp;float voltage_v;float current_a;float discharged_mah;bool connected;float[2] voltage_cell_v;",
  ];
  definitions.forEach((d, i) => {
    out.push(message("F", d));
    const s = Buffer.alloc(3);
    s[0] = 0;
    s.writeUInt16LE(i, 1);
    out.push(message("A", Buffer.concat([s, Buffer.from(d.split(":")[0])])));
  });
  const data = (id: number, t: number) => {
    let b: Buffer;
    if (id === 0) {
      b = Buffer.alloc(11);
      b.writeUInt16LE(id);
      b.writeBigUInt64LE(BigInt(t * 1e6), 2);
      b[10] = t >= 2 && t < 6 ? 1 : 0;
    } else if (id === 1) {
      b = Buffer.alloc(31);
      b.writeUInt16LE(id);
      b.writeBigUInt64LE(BigInt(t * 1e6), 2);
      b.writeBigUInt64LE(BigInt(1760000000000000 + t * 1e6), 10);
      b.writeInt32LE(185204300, 18);
      b.writeInt32LE(738567440 + t * 10, 22);
      b.writeInt32LE(500000 + t * 1000, 26);
      b[30] = 3;
    } else {
      b = Buffer.alloc(31);
      b.writeUInt16LE(id);
      b.writeBigUInt64LE(BigInt(t * 1e6), 2);
      b.writeFloatLE(25 - t / 10, 10);
      b.writeFloatLE(missing ? -1 : 30, 14);
      b.writeFloatLE(missing ? -1 : t * 100, 18);
      b[22] = 1;
      b.writeFloatLE(4, 23);
      b.writeFloatLE(4, 27);
    }
    return message("D", b);
  };
  for (let t = 1; t <= 6; t++) {
    out.push(data(0, t), data(1, t), data(2, t));
  }
  if (reset) out.push(data(1, 3));
  if (dropout) out.push(message("O", Buffer.from([10, 0])));
  if (truncated) out.push(Buffer.from([40, 0, 68, 0]));
  const b = Buffer.concat(out);
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}
test("ULog decodes timing, scaled coordinates, battery channels and omitted trailing padding", () => {
  const p = parseLog(synthetic(), "synthetic.ulg"),
    f = p.flights[0];
  assert.equal(p.format, "ULog");
  assert.equal(f.start, 2);
  assert.equal(f.end, 6);
  assert.equal(f.complete, true);
  assert.equal(f.startUtc, "2025-10-09T08:53:22.000Z");
  assert.equal(f.route[0].lat, 18.52043);
  assert.equal(f.route[0].alt, 502);
  assert.equal(f.route[0].relative, null);
  assert.equal(f.batteries[0].current, 30);
  assert.equal(f.batteries[0].consumed, 200);
  assert.equal(f.batteries[0].instance, 0);
  assert.equal(f.batteries[0].cells.length, 2);
});
test("ULog refuses clock rollback, invalid headers and appended crash data; marks truncation and dropouts", () => {
  assert.throws(() => parseLog(synthetic({ reset: true }), "a.ulg"), /clock/);
  assert.throws(
    () => parseLog(synthetic({ incompatible: true }), "a.ulg"),
    /crash/,
  );
  assert.throws(() => parseLog(new ArrayBuffer(18), "a.ulg"), /header/);
  for (const input of [{ truncated: true }, { dropout: true }])
    assert.equal(
      parseLog(synthetic(input), "a.ulg").flights[0].complete,
      false,
    );
  const f = parseLog(synthetic({ missing: true }), "a.ulg").flights[0];
  assert.equal(f.batteries[0].current, null);
  assert.equal(f.batteries[0].consumed, null);
});
test("Official pyulog sample matches independent message count and recording window without inventing GPS/battery", () => {
  const b = fs.readFileSync("docs/fixtures/px4-pyulog-sample.ulg"),
    p = parseLog(
      b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
      "sample.ulg",
    ),
    f = p.flights[0];
  assert.equal(p.messages, 64542);
  assert.equal(f.start, 112.500176);
  assert.equal(f.end, 181.493506);
  assert.equal(f.route.length, 0);
  assert.equal(f.batteries.length, 0);
  assert.equal(f.startUtc, null);
  assert.equal(f.complete, false);
  assert.equal(f.boundary, "log window");
  assert.ok(p.warnings.some((v) => v.startsWith("4 ULog")));
  assert.ok(p.warnings.some((v) => v.includes("precede")));
});
