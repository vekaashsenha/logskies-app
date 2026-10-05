import type { ParsedLog, Point, BatterySample, ParsedFlight } from "./index.ts";

// Focused evidence decoder. Unknown topics remain in the retained original.
const sizes: Record<string, number> = {
  int8_t: 1,
  uint8_t: 1,
  bool: 1,
  char: 1,
  int16_t: 2,
  uint16_t: 2,
  int32_t: 4,
  uint32_t: 4,
  float: 4,
  int64_t: 8,
  uint64_t: 8,
  double: 8,
};
type Field = {
  type: string;
  name: string;
  count: number;
  offset: number;
  size: number;
};
type Value = number | number[];
type Topic = {
  name: string;
  instance: number;
  fields: Field[];
  length: number;
  minimum: number;
  last: number;
};
export function parseULog(bytes: Uint8Array): ParsedLog {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = [0x55, 0x4c, 0x6f, 0x67, 1, 0x12, 0x35];
  if (bytes.length < 16 || magic.some((b, i) => bytes[i] !== b))
    throw new Error("Invalid PX4 ULog header.");
  if (![0, 1, 2].includes(bytes[7]))
    throw new Error(
      "Unsupported ULog version; retain the original for specialist review.",
    );
  const text = (a: number, b: number) =>
    new TextDecoder().decode(bytes.subarray(a, b)).replace(/\0+$/, "");
  const formats = new Map<string, string>(),
    topics = new Map<number, Topic>();
  const warnings: string[] = [];
  const headerStart = Number(view.getBigUint64(8, true)) / 1e6;
  if (
    !Number.isFinite(headerStart) ||
    headerStart > Number.MAX_SAFE_INTEGER / 1e6
  )
    throw new Error("Invalid ULog start timestamp.");
  let messages = 0,
    first = headerStart,
    last = -Infinity,
    dropouts = 0,
    stale = 0,
    truncated = false;
  const points: Point[] = [],
    batteries: BatterySample[] = [],
    arms: { t: number; armed: boolean }[] = [];
  const gpsPoints: Point[] = [];
  const offsets: number[] = [];
  function layout(
    name: string,
    stack: string[] = [],
  ): { fields: Field[]; length: number; minimum: number } {
    if (stack.length > 16 || stack.includes(name))
      throw new Error("Invalid recursive ULog format.");
    const definition = formats.get(name);
    if (!definition) throw new Error("Missing ULog format: " + name);
    const fields: Field[] = [];
    let length = 0,
      minimum = 0;
    for (const field of definition.split(";").filter(Boolean)) {
      const m = /^([\w]+)(?:\[(\d+)\])? ([\w]+)$/.exec(field.trim());
      if (!m) throw new Error("Invalid ULog field definition.");
      const count = Number(m[2] ?? 1);
      if (count < 1 || count > 65535)
        throw new Error("Invalid ULog array size.");
      const size = sizes[m[1]] ?? layout(m[1], [...stack, name]).length;
      fields.push({ type: m[1], name: m[3], count, offset: length, size });
      length += size * count;
      if (length > 65535) throw new Error("ULog topic exceeds supported size.");
      if (!m[3].startsWith("_padding")) minimum = length;
    }
    return { fields, length, minimum };
  }
  function scalar(type: string, p: number): number {
    switch (type) {
      case "float":
        return view.getFloat32(p, true);
      case "double":
        return view.getFloat64(p, true);
      case "uint64_t": {
        const n = view.getBigUint64(p, true);
        if (n > BigInt(Number.MAX_SAFE_INTEGER))
          throw new Error("ULog integer exceeds safe precision.");
        return Number(n);
      }
      case "int64_t":
        return Number(view.getBigInt64(p, true));
      case "uint32_t":
        return view.getUint32(p, true);
      case "int32_t":
        return view.getInt32(p, true);
      case "uint16_t":
        return view.getUint16(p, true);
      case "int16_t":
        return view.getInt16(p, true);
      case "int8_t":
        return view.getInt8(p);
      default:
        return view.getUint8(p);
    }
  }
  const supported = new Set([
    "vehicle_global_position",
    "vehicle_gps_position",
    "sensor_gps",
    "battery_status",
    "actuator_armed",
  ]);
  for (let p = 16; p < bytes.length;) {
    if (p + 3 > bytes.length) {
      truncated = true;
      break;
    }
    const size = view.getUint16(p, true),
      type = String.fromCharCode(bytes[p + 2]),
      a = p + 3,
      end = a + size;
    if (end > bytes.length) {
      truncated = true;
      break;
    }
    if (type === "B") {
      if (size < 40) throw new Error("Invalid ULog flag message.");
      if (bytes.subarray(a + 8, a + 16).some((b) => b !== 0))
        throw new Error(
          "Appended crash data or incompatible ULog flags are not supported. Use pyulog for specialist review.",
        );
    } else if (type === "F") {
      const d = text(a, end),
        split = d.indexOf(":");
      if (split < 1) throw new Error("Invalid ULog format message.");
      formats.set(d.slice(0, split), d.slice(split + 1));
    } else if (type === "A") {
      if (size < 4) throw new Error("Invalid ULog subscription.");
      const id = view.getUint16(a + 1, true),
        name = text(a + 3, end);
      topics.set(id, {
        name,
        instance: bytes[a],
        ...layout(name),
        last: -Infinity,
      });
    } else if (type === "R") {
      if (size !== 2) throw new Error("Invalid ULog unsubscribe message.");
      topics.delete(view.getUint16(a, true));
    } else if (type === "O") {
      dropouts++;
    } else if (type === "D") {
      if (size < 2) throw new Error("Invalid ULog data message.");
      const topic = topics.get(view.getUint16(a, true));
      if (!topic) throw new Error("ULog data has no topic subscription.");
      const n = size - 2,
        base = a + 2;
      if (n < topic.minimum || n > topic.length)
        throw new Error("ULog data does not match its declared format.");
      const timestamp = topic.fields.find(
        (f) => f.name === "timestamp" && f.type === "uint64_t" && f.count === 1,
      );
      if (!timestamp) throw new Error("ULog topic lacks a valid timestamp.");
      const t = scalar("uint64_t", base + timestamp.offset) / 1e6;
      if (t < topic.last)
        throw new Error(
          "ULog topic clock moved backwards; split the log before import.",
        );
      topic.last = t;
      messages++;
      if (t < headerStart) {
        stale++;
        p = end;
        continue;
      }
      last = Math.max(last, t);
      if (!supported.has(topic.name)) {
        p = end;
        continue;
      }
      const data: Record<string, Value> = {};
      for (const f of topic.fields)
        if (
          sizes[f.type] &&
          f.offset + f.count * f.size <= n &&
          !f.name.startsWith("_padding")
        )
          data[f.name] =
            f.count === 1
              ? scalar(f.type, base + f.offset)
              : Array.from({ length: f.count }, (_, i) =>
                  scalar(f.type, base + f.offset + i * f.size),
                );
      const val = (key: string) =>
        typeof data[key] === "number" ? (data[key] as number) : NaN;
      const nullable = (v: number) => (Number.isFinite(v) ? v : null);
      if (topic.name === "actuator_armed" && topic.instance === 0)
        arms.push({ t, armed: val("armed") === 1 });
      if (topic.name === "battery_status") {
        const connected = val("connected") !== 0;
        batteries.push({
          t,
          instance: topic.instance,
          voltage:
            connected && val("voltage_v") > 0
              ? nullable(val("voltage_v"))
              : null,
          current:
            connected && val("current_a") >= 0
              ? nullable(val("current_a"))
              : null,
          consumed:
            connected && val("discharged_mah") >= 0
              ? nullable(val("discharged_mah"))
              : null,
          cells: Array.isArray(data.voltage_cell_v)
            ? data.voltage_cell_v.filter((v) => v > 0 && Number.isFinite(v))
            : [],
        });
      }
      if (
        topic.instance === 0 &&
        (topic.name === "vehicle_global_position" ||
          topic.name === "vehicle_gps_position" ||
          topic.name === "sensor_gps")
      ) {
        const global = topic.name === "vehicle_global_position";
        const modern = Number.isFinite(val("latitude_deg"));
        const lat = modern
            ? val("latitude_deg")
            : val("lat") / (global ? 1 : 1e7),
          lon = modern ? val("longitude_deg") : val("lon") / (global ? 1 : 1e7);
        const alt = modern
          ? val("altitude_msl_m")
          : val("alt") / (global ? 1 : 1000);
        if (
          (global || val("fix_type") >= 3) &&
          Number.isFinite(lat) &&
          Number.isFinite(lon) &&
          Math.abs(lat) <= 90 &&
          Math.abs(lon) <= 180 &&
          !(lat === 0 && lon === 0)
        )
          (global ? points : gpsPoints).push({
            t,
            lat,
            lon,
            alt: nullable(alt),
            relative: null,
          });
        if (
          !global &&
          val("time_utc_usec") >= 946684800000000 &&
          val("time_utc_usec") < 4102444800000000
        )
          offsets.push(val("time_utc_usec") / 1000 - t * 1000);
      }
    }
    p = end;
  }
  if (!messages || !Number.isFinite(first) || last <= first)
    throw new Error("ULog has no usable timed observations.");
  if (dropouts)
    warnings.push(
      `${dropouts} ULog logging dropout record(s); telemetry may be missing.`,
    );
  if (stale)
    warnings.push(
      `${stale} topic observations precede the ULog recording start; excluded from the log window and summaries.`,
    );
  if (truncated)
    warnings.push(
      "Truncated ULog message discarded; source log is incomplete.",
    );
  warnings.push(
    "Only position, battery and actuator arming topics are summarized. CPU, estimator and other forensic topics remain in the original log.",
  );
  const route = (points.length ? points : gpsPoints).sort((a, b) => a.t - b.t);
  batteries.sort((a, b) => a.t - b.t);
  arms.sort((a, b) => a.t - b.t);
  offsets.sort((a, b) => a - b);
  const clock = offsets.length ? offsets[Math.floor(offsets.length / 2)] : null;
  const utc = (t: number) =>
    clock !== null && offsets.every((v) => Math.abs(v - clock) < 2000)
      ? new Date(t * 1000 + clock).toISOString()
      : null;
  const intervals: { start: number; end: number; complete: boolean }[] = [];
  let opened: number | null = null,
    observedDisarmed = false,
    trusted = false;
  for (const arm of arms) {
    if (arm.armed && opened === null) {
      opened = arm.t;
      trusted = observedDisarmed;
    }
    if (!arm.armed && opened !== null) {
      if (arm.t > opened)
        intervals.push({
          start: opened,
          end: arm.t,
          complete: trusted && !truncated && !dropouts,
        });
      opened = null;
    }
    if (!arm.armed) observedDisarmed = true;
  }
  if (opened !== null)
    intervals.push({ start: opened, end: last, complete: false });
  if (intervals.length > 128)
    throw new Error("Too many ULog arming intervals; split the source.");
  const armed = intervals.length > 0;
  if (!armed) intervals.push({ start: first, end: last, complete: false });
  const flights = intervals.map((interval, index): ParsedFlight => {
    const r = route.filter((v) => v.t >= interval.start && v.t <= interval.end),
      b = batteries.filter((v) => v.t >= interval.start && v.t <= interval.end);
    if (r.length > 20000)
      throw new Error("Route exceeds 20,000 samples; split the source log.");
    const base = r.find((v) => v.alt !== null)?.alt;
    const max =
      base === undefined || base === null
        ? null
        : r.reduce(
            (m, v) => (v.alt === null ? m : Math.max(m, v.alt - base)),
            0,
          );
    return {
      index,
      ...interval,
      startUtc: utc(interval.start),
      endUtc: utc(interval.end),
      boundary: armed ? "armed interval" : "log window",
      durationMinutes: (interval.end - interval.start) / 60,
      route: r,
      batteries: b,
      maxRelativeAltitude: max,
      warnings: [
        ...warnings,
        "Arming bounds are proxies, not confirmed takeoff/landing. Relative altitude is not terrain AGL.",
        ...(!interval.complete ? ["Incomplete flight boundary evidence."] : []),
        ...(!utc(interval.start)
          ? [
              "UTC timestamp unavailable or inconsistent; manual review required.",
            ]
          : []),
        ...(!r.length ? ["No valid position samples."] : []),
        ...(!b.length ? ["No battery telemetry samples."] : []),
      ],
    };
  });
  return {
    format: "ULog",
    parserVersion: "logskies-ulog-1.0",
    messages,
    systemId: null,
    flights,
    warnings,
  };
}
