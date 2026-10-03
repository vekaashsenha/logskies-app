import schemaJson from "./mavlink-schema.json" with { type: "json" };
export const PARSER_VERSION = "logskies-browser-1.0";
export type Point = {
  t: number;
  lat: number;
  lon: number;
  alt: number | null;
  relative: number | null;
};
export type BatterySample = {
  t: number;
  instance: number;
  voltage: number | null;
  current: number | null;
  consumed: number | null;
  cells: number[];
};
export type ParsedFlight = {
  index: number;
  start: number;
  end: number;
  startUtc: string | null;
  endUtc: string | null;
  boundary: "armed interval" | "log window";
  complete: boolean;
  durationMinutes: number;
  route: Point[];
  batteries: BatterySample[];
  maxRelativeAltitude: number | null;
  warnings: string[];
};
export type ParsedLog = {
  format: "DataFlash" | "MAVLink";
  parserVersion: string;
  messages: number;
  systemId: number | null;
  flights: ParsedFlight[];
  warnings: string[];
};
type RecordValue = number | string | number[];
type Row = {
  name: string;
  fields: Record<string, RecordValue>;
  t: number;
  epoch: number | null;
  system: number;
};
type Field = {
  name: string;
  type: string;
  count: number;
  array: boolean;
  offset: number;
};
type Schema = {
  name: string;
  crcExtra: number;
  minLength: number;
  length: number;
  fields: Field[];
};
const schemas = schemaJson as Record<string, Schema>;
const scalarSizes: Record<string, number> = {
  b: 1,
  B: 1,
  M: 1,
  h: 2,
  H: 2,
  c: 2,
  C: 2,
  g: 2,
  i: 4,
  I: 4,
  e: 4,
  E: 4,
  L: 4,
  f: 4,
  d: 8,
  q: 8,
  Q: 8,
  n: 4,
  N: 16,
  Z: 64,
  a: 64,
};
const relevant = new Set([
  "ARM",
  "EV",
  "GPS",
  "GPS2",
  "POS",
  "CTUN",
  "BAT",
  "BAT2",
  "BCL",
  "BCL2",
]);
const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const num = (fields: Row["fields"], key: string, fallback = NaN) =>
  finite(fields[key]) ? (fields[key] as number) : fallback;
function half(value: number) {
  const sign = value & 32768 ? -1 : 1;
  const exp = (value >> 10) & 31;
  const frac = value & 1023;
  return exp === 31
    ? frac
      ? NaN
      : sign * Infinity
    : sign * (exp ? (1 + frac / 1024) * 2 ** (exp - 15) : frac * 2 ** -24);
}
function dfScalar(
  view: DataView,
  bytes: Uint8Array,
  offset: number,
  type: string,
): RecordValue {
  switch (type) {
    case "b":
    case "M":
      return view.getInt8(offset);
    case "B":
      return view.getUint8(offset);
    case "h":
      return view.getInt16(offset, true);
    case "H":
      return view.getUint16(offset, true);
    case "c":
      return view.getInt16(offset, true) / 100;
    case "C":
      return view.getUint16(offset, true) / 100;
    case "i":
      return view.getInt32(offset, true);
    case "I":
      return view.getUint32(offset, true);
    case "e":
      return view.getInt32(offset, true) / 100;
    case "E":
      return view.getUint32(offset, true) / 100;
    case "L":
      return view.getInt32(offset, true) / 1e7;
    case "f":
      return view.getFloat32(offset, true);
    case "g":
      return half(view.getUint16(offset, true));
    case "d":
      return view.getFloat64(offset, true);
    case "q":
      return Number(view.getBigInt64(offset, true));
    case "Q":
      return Number(view.getBigUint64(offset, true));
    case "a":
      return Array.from({ length: 32 }, (_, i) =>
        view.getInt16(offset + i * 2, true),
      );
    default:
      return new TextDecoder()
        .decode(bytes.subarray(offset, offset + scalarSizes[type]))
        .split("\0")[0];
  }
}
function validEpoch(ms: number) {
  return finite(ms) && ms >= 946684800000 && ms < 4102444800000;
}
function readDataFlash(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const formats = new Map<
    number,
    { name: string; length: number; format: string; columns: string[] }
  >();
  const rows: Row[] = [];
  let messages = 0,
    skipped = 0;
  const warnings: string[] = [];
  const text = (offset: number, length: number) =>
    new TextDecoder()
      .decode(bytes.subarray(offset, offset + length))
      .split("\0")[0];
  for (let offset = 0; offset < bytes.length;) {
    if (bytes[offset] !== 0xa3 || bytes[offset + 1] !== 0x95) {
      skipped++;
      offset++;
      continue;
    }
    const type = bytes[offset + 2];
    if (type === 128) {
      if (offset + 89 > bytes.length) {
        warnings.push("Truncated FMT record.");
        break;
      }
      const target = bytes[offset + 3],
        length = bytes[offset + 4],
        name = text(offset + 5, 4),
        format = text(offset + 9, 16),
        columns = text(offset + 25, 64).split(",");
      const calculated =
        3 +
        [...format].reduce(
          (total, char) => total + (scalarSizes[char] ?? 10000),
          0,
        );
      if (length === calculated && columns.length === format.length)
        formats.set(target, { name, length, format, columns });
      else warnings.push("Unsupported or inconsistent FMT definition: " + name);
      offset += 89;
      messages++;
      continue;
    }
    const format = formats.get(type);
    if (!format) {
      skipped++;
      offset++;
      continue;
    }
    if (offset + format.length > bytes.length) {
      warnings.push("Truncated " + format.name + " record.");
      break;
    }
    messages++;
    if (relevant.has(format.name)) {
      const fields: Row["fields"] = {};
      let at = offset + 3;
      [...format.format].forEach((char, i) => {
        fields[format.columns[i]] = dfScalar(view, bytes, at, char);
        at += scalarSizes[char];
      });
      const time = num(fields, "TimeUS", num(fields, "TimeMS") * 1000) / 1e6;
      if (finite(time)) {
        let epoch: number | null = null;
        if (
          format.name === "GPS" &&
          num(fields, "Status") >= 3 &&
          num(fields, "GWk") >= 1042 &&
          num(fields, "GMS") >= 0 &&
          num(fields, "GMS") < 604800000
        ) {
          const utc =
            315964800000 +
            num(fields, "GWk") * 604800000 +
            num(fields, "GMS") -
            18000;
          if (validEpoch(utc)) epoch = utc;
        }
        rows.push({ name: format.name, fields, t: time, epoch, system: 0 });
        if (rows.length > 400000)
          throw new Error(
            "Too many telemetry samples. Split this log into smaller files.",
          );
      }
    }
    offset += format.length;
  }
  if (!formats.size || !rows.length)
    throw new Error(
      "No supported DataFlash telemetry found. A complete FMT-bearing .bin log is required.",
    );
  if (skipped)
    warnings.push(
      skipped + " bytes could not be decoded; inspect log integrity.",
    );
  warnings.push(
    "DataFlash has no per-record CRC. GPS UTC conversion uses GPS−UTC = 18 seconds.",
  );
  return { rows, messages, warnings };
}
export function crcX25(bytes: Uint8Array, extra: number) {
  let crc = 65535;
  for (const byte of [...bytes, extra]) {
    let tmp = byte ^ (crc & 255);
    tmp ^= (tmp << 4) & 255;
    crc = ((crc >> 8) ^ (tmp << 8) ^ (tmp << 3) ^ (tmp >> 4)) & 65535;
  }
  return crc;
}
function mavScalar(view: DataView, offset: number, type: string): number {
  switch (type) {
    case "char":
    case "uint8_t":
    case "uint8_t_mavlink_version":
      return view.getUint8(offset);
    case "int8_t":
      return view.getInt8(offset);
    case "uint16_t":
      return view.getUint16(offset, true);
    case "int16_t":
      return view.getInt16(offset, true);
    case "uint32_t":
      return view.getUint32(offset, true);
    case "int32_t":
      return view.getInt32(offset, true);
    case "uint64_t":
      return Number(view.getBigUint64(offset, true));
    case "int64_t":
      return Number(view.getBigInt64(offset, true));
    case "float":
      return view.getFloat32(offset, true);
    default:
      return view.getFloat64(offset, true);
  }
}
function readMavlink(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const rows: Row[] = [];
  let messages = 0,
    bad = 0,
    unknown = 0,
    signed = 0;
  const lastTime = new Map<number, number>();
  for (let offset = 0; offset < bytes.length;) {
    const magic = bytes[offset];
    if (
      offset + 9 < bytes.length &&
      (bytes[offset + 8] === 0xfe || bytes[offset + 8] === 0xfd) &&
      validEpoch(Number(view.getBigUint64(offset, false)) / 1000)
    ) {
      offset += 8;
      continue;
    }
    if (magic !== 0xfe && magic !== 0xfd) {
      offset++;
      continue;
    }
    const v2 = magic === 0xfd,
      header = v2 ? 10 : 6;
    if (offset + header + 2 > bytes.length) break;
    const length = bytes[offset + 1],
      flags = v2 ? bytes[offset + 2] : 0,
      packetSize = header + length + 2 + (flags & 1 ? 13 : 0);
    if (offset + packetSize > bytes.length) {
      bad++;
      offset++;
      continue;
    }
    const system = bytes[offset + (v2 ? 5 : 3)],
      component = bytes[offset + (v2 ? 6 : 4)];
    const id = v2
      ? bytes[offset + 7] + bytes[offset + 8] * 256 + bytes[offset + 9] * 65536
      : bytes[offset + 5];
    const schema = schemas[id];
    if (flags & ~1) {
      bad++;
      offset += packetSize;
      continue;
    }
    if (!schema) {
      unknown++;
      offset += packetSize;
      continue;
    }
    const expected = view.getUint16(offset + header + length, true);
    if (
      length > schema.length ||
      (!v2 && length !== schema.minLength) ||
      crcX25(
        bytes.subarray(offset + 1, offset + header + length),
        schema.crcExtra,
      ) !== expected
    ) {
      bad++;
      offset += packetSize;
      continue;
    }
    messages++;
    if (flags & 1) signed++;
    if (component !== 1) {
      offset += packetSize;
      continue;
    }
    const payload = new Uint8Array(schema.length);
    payload.set(bytes.subarray(offset + header, offset + header + length));
    const pv = new DataView(payload.buffer);
    const fields: Row["fields"] = {};
    for (const field of schema.fields) {
      const size =
        field.type.includes("64") || field.type === "double"
          ? 8
          : field.type.includes("32") || field.type === "float"
            ? 4
            : field.type.includes("16")
              ? 2
              : 1;
      fields[field.name] = field.array
        ? Array.from({ length: field.count }, (_, i) =>
            mavScalar(pv, field.offset + i * size, field.type),
          )
        : mavScalar(pv, field.offset, field.type);
    }
    let epoch: number | null = null;
    if (offset >= 8) {
      const capture = Number(view.getBigUint64(offset - 8, false)) / 1000;
      if (validEpoch(capture)) epoch = capture;
    }
    const captureEpoch = epoch;
    let t = num(fields, "time_boot_ms") / 1000;
    if (!finite(t)) {
      const us = num(fields, "time_usec");
      if (validEpoch(us / 1000)) {
        epoch = us / 1000;
        t = lastTime.get(system) ?? 0;
      } else t = finite(us) ? us / 1e6 : (lastTime.get(system) ?? 0);
    }
    if (
      schema.name === "SYSTEM_TIME" &&
      validEpoch(num(fields, "time_unix_usec") / 1000)
    )
      epoch = num(fields, "time_unix_usec") / 1000;
    lastTime.set(system, t);
    // Timestamped tlogs use capture UTC for ordering, avoiding stale heartbeat boot clocks.
    rows.push({
      name: schema.name,
      fields,
      t: captureEpoch !== null ? captureEpoch / 1000 : t,
      epoch,
      system,
    });
    if (rows.length > 400000)
      throw new Error(
        "Too many telemetry samples. Split this log into smaller files.",
      );
    offset += packetSize;
  }
  if (!rows.length)
    throw new Error("No supported CRC-valid MAVLink messages found.");
  const warnings: string[] = [];
  if (bad) warnings.push(bad + " malformed or CRC-invalid packets rejected.");
  if (unknown) warnings.push(unknown + " unsupported message packets skipped.");
  if (signed)
    warnings.push(
      "Signed packets passed CRC checks; cryptographic signatures were not authenticated.",
    );
  return { rows, messages, warnings };
}
function coordinate(lat: number, lon: number) {
  return (
    finite(lat) && finite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180
  );
}
function normalize(rows: Row[]) {
  const points: Point[] = [],
    batteries: BatterySample[] = [],
    arms: { t: number; armed: boolean; explicit?: boolean }[] = [];
  for (const row of rows) {
    const f = row.fields,
      t = row.t;
    if (row.name === "ARM")
      arms.push({ t, armed: num(f, "ArmState") === 1, explicit: true });
    if (row.name === "EV" && [10, 11].includes(num(f, "Id")))
      arms.push({ t, armed: num(f, "Id") === 10, explicit: true });
    if (row.name === "HEARTBEAT" && num(f, "autopilot") !== 8)
      arms.push({ t, armed: (num(f, "base_mode") & 128) !== 0 });
    let lat = NaN,
      lon = NaN,
      alt: number | null = null,
      relative: number | null = null;
    if (
      row.name === "POS" ||
      (row.name === "GPS" && num(f, "Status") >= 3 && num(f, "I", 0) === 0)
    ) {
      lat = num(f, "Lat");
      lon = num(f, "Lng");
      alt = num(f, "Alt");
      relative = num(f, "RelHomeAlt");
    }
    if (row.name === "GLOBAL_POSITION_INT") {
      lat = num(f, "lat") / 1e7;
      lon = num(f, "lon") / 1e7;
      alt = num(f, "alt") / 1000;
      relative = num(f, "relative_alt") / 1000;
    }
    if (row.name === "GPS_RAW_INT" && num(f, "fix_type") >= 3) {
      lat = num(f, "lat") / 1e7;
      lon = num(f, "lon") / 1e7;
      alt = num(f, "alt") / 1000;
    }
    if (coordinate(lat, lon))
      points.push({
        t,
        lat,
        lon,
        alt: finite(alt) ? alt : null,
        relative: finite(relative) ? relative : null,
      });
    if (["BAT", "BAT2", "BCL", "BCL2"].includes(row.name)) {
      const cells = Object.entries(f)
        .filter(
          ([name, value]) =>
            /^V\d+$/.test(name) && finite(value) && value > 0 && value < 65535,
        )
        .sort(([a], [b]) => Number(a.slice(1)) - Number(b.slice(1)))
        .map(([, value]) => (value as number) / 1000);
      batteries.push({
        t,
        instance: num(
          f,
          "Inst",
          num(f, "Instance", row.name === "BAT2" ? 1 : 0),
        ),
        voltage: finite(f.Volt) && f.Volt > 0 ? f.Volt : null,
        current: finite(f.Curr) && f.Curr >= 0 ? f.Curr : null,
        consumed: finite(f.CurrTot) && f.CurrTot >= 0 ? f.CurrTot : null,
        cells,
      });
    }
    if (row.name === "BATTERY_STATUS") {
      const cells = (Array.isArray(f.voltages) ? f.voltages : [])
        .filter((v) => v > 0 && v < 65535)
        .map((v) => v / 1000);
      const current = num(f, "current_battery"),
        consumed = num(f, "current_consumed");
      batteries.push({
        t,
        instance: num(f, "id", 0),
        voltage: cells.length ? cells.reduce((a, b) => a + b, 0) : null,
        current: current >= 0 ? current / 100 : null,
        consumed: consumed >= 0 ? consumed : null,
        cells: cells.length > 1 ? cells : [],
      });
    }
    if (row.name === "SYS_STATUS") {
      const v = num(f, "voltage_battery"),
        i = num(f, "current_battery");
      batteries.push({
        t,
        instance: 0,
        voltage: v > 0 && v < 65535 ? v / 1000 : null,
        current: i >= 0 ? i / 100 : null,
        consumed: null,
        cells: [],
      });
    }
  }
  return { points, batteries, arms };
}
export function parseLog(
  buffer: ArrayBuffer,
  filename: string,
  systemId?: number,
): ParsedLog {
  if (buffer.byteLength === 0 || buffer.byteLength > 50 * 1024 * 1024)
    throw new Error("Choose a nonempty log under 50 MB.");
  const bytes = new Uint8Array(buffer);
  const format = filename.toLowerCase().endsWith(".bin")
    ? "DataFlash"
    : filename.toLowerCase().endsWith(".tlog")
      ? "MAVLink"
      : null;
  if (!format)
    throw new Error("Supported files: ArduPilot .bin or MAVLink .tlog.");
  const decoded =
    format === "DataFlash" ? readDataFlash(bytes) : readMavlink(bytes);
  const systems = [...new Set(decoded.rows.map((row) => row.system))];
  if (systems.length > 1 && systemId === undefined)
    throw new Error(
      "Multiple MAVLink systems found (" +
        systems.join(", ") +
        "). Enter the aircraft system ID and import again.",
    );
  const chosen = format === "DataFlash" ? 0 : (systemId ?? systems[0]);
  const rows = decoded.rows.filter((row) => row.system === chosen);
  if (!rows.length) throw new Error("No telemetry for the selected system ID.");
  for (let i = 1; i < rows.length; i++)
    if (rows[i].t < rows[i - 1].t - 10)
      throw new Error(
        "Log clock resets or mixes clock domains. Split the log before import.",
      );
  rows.sort((a, b) => a.t - b.t);
  const normalized = normalize(rows),
    anchors = rows.filter((row) => row.epoch !== null);
  const offsets = anchors
    .map((row) => row.epoch! - row.t * 1000)
    .sort((a, b) => a - b);
  const clock = offsets.length ? offsets[Math.floor(offsets.length / 2)] : null;
  const clockValid =
    clock !== null &&
    offsets.every((offset) => Math.abs(offset - clock) < 2000);
  const utc = (t: number) =>
    clockValid && validEpoch(t * 1000 + clock!)
      ? new Date(t * 1000 + clock!).toISOString()
      : null;
  const intervals: { start: number; end: number; complete: boolean }[] = [];
  let start: number | null = null;
  let observedDisarmed = false,
    trustedStart = false;
  for (const arm of normalized.arms) {
    if (arm.armed && start === null) {
      start = arm.t;
      trustedStart = !!arm.explicit || observedDisarmed;
    } else if (!arm.armed && start !== null) {
      if (arm.t > start)
        intervals.push({ start, end: arm.t, complete: trustedStart });
      start = null;
    }
    if (!arm.armed) observedDisarmed = true;
    if (intervals.length > 128)
      throw new Error(
        "Too many arming intervals; split this log before importing.",
      );
  }
  if (start !== null)
    intervals.push({ start, end: rows[rows.length - 1].t, complete: false });
  const armed = intervals.length > 0;
  if (!armed)
    intervals.push({
      start: rows[0].t,
      end: rows[rows.length - 1].t,
      complete: false,
    });
  const flights = intervals.map((interval, index): ParsedFlight => {
    const route = normalized.points.filter(
      (p) => p.t >= interval.start && p.t <= interval.end,
    );
    if (route.length > 20000)
      throw new Error(
        "Route exceeds 20,000 samples. Split this log; no points were silently dropped.",
      );
    const battery = normalized.batteries.filter(
      (p) => p.t >= interval.start && p.t <= interval.end,
    );
    const relative = route
      .filter((p) => p.relative !== null)
      .map((p) => p.relative!);
    const base = route.find((p) => p.alt !== null)?.alt;
    const maxRelative = relative.length
      ? Math.max(...relative)
      : base !== undefined && base !== null && route.length
        ? Math.max(...route.map((p) => (p.alt === null ? 0 : p.alt - base)))
        : null;
    const warnings = [...decoded.warnings];
    warnings.push(
      armed
        ? "Arming/disarming bounds are proxies, not confirmed takeoff/landing times."
        : "No complete arming interval detected; this is a log window, not a verified flight.",
    );
    if (!interval.complete)
      warnings.push("Incomplete flight boundary evidence.");
    if (!clockValid)
      warnings.push(
        "UTC timestamp unavailable or inconsistent. Matching and date checks require manual review.",
      );
    if (!route.length) warnings.push("No valid position samples.");
    if (route.length > 20000)
      throw new Error(
        "Route exceeds 20,000 samples. Split this log; no points were silently dropped.",
      );
    warnings.push(
      "Relative altitude is not verified height above ground across the route.",
    );
    return {
      index,
      start: interval.start,
      end: interval.end,
      startUtc: utc(interval.start),
      endUtc: utc(interval.end),
      boundary: armed ? "armed interval" : "log window",
      complete: interval.complete,
      durationMinutes: (interval.end - interval.start) / 60,
      route,
      batteries: battery,
      maxRelativeAltitude: maxRelative,
      warnings,
    };
  });
  return {
    format,
    parserVersion: PARSER_VERSION,
    messages: decoded.messages,
    systemId: format === "MAVLink" ? chosen : null,
    flights,
    warnings: decoded.warnings,
  };
}
