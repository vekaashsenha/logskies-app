import type { Point } from "./index.ts";
type Position = [number, number];
type Polygon = Position[][];
export type ZoneFeature = {
  zone: "green" | "yellow" | "red";
  name: string;
  polygons: Polygon[];
  bbox: [number, number, number, number];
};
export type ZoneDataset = {
  source: string;
  publishedOn: string;
  features: ZoneFeature[];
};
export type AirspaceResult = {
  zones: string[];
  coverageComplete: boolean;
  mostRestrictive: "unknown" | "green" | "yellow" | "red";
  intersectedFeatures: string[];
  notes: string[];
};
export function parseZones(
  input: unknown,
  source: string,
  publishedOn: string,
): ZoneDataset {
  if (!source.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(publishedOn))
    throw new Error("Provide the map source and publication date.");
  if (
    !input ||
    typeof input !== "object" ||
    !("type" in input) ||
    input.type !== "FeatureCollection" ||
    !("features" in input) ||
    !Array.isArray(input.features) ||
    input.features.length === 0 ||
    input.features.length > 200
  )
    throw new Error(
      "Choose a regional GeoJSON FeatureCollection with 1–200 zone features.",
    );
  let edges = 0;
  const features = input.features.map((item: unknown): ZoneFeature => {
    if (!item || typeof item !== "object")
      throw new Error("Invalid zone feature.");
    const f = item as {
      properties?: { zone?: unknown; name?: unknown };
      geometry?: { type?: unknown; coordinates?: unknown };
    };
    const zone = f.properties?.zone;
    if (zone !== "green" && zone !== "yellow" && zone !== "red")
      throw new Error(
        "Each feature needs properties.zone = green, yellow or red.",
      );
    const geometry = f.geometry;
    const raw =
      geometry?.type === "Polygon"
        ? [geometry.coordinates]
        : geometry?.type === "MultiPolygon"
          ? geometry.coordinates
          : null;
    if (!Array.isArray(raw) || !raw.length)
      throw new Error("Only Polygon and MultiPolygon zones are supported.");
    const bbox: [number, number, number, number] = [
      Infinity,
      Infinity,
      -Infinity,
      -Infinity,
    ];
    const polygons: Polygon[] = raw.map((polygon: unknown) => {
      if (!Array.isArray(polygon) || !polygon.length)
        throw new Error("Invalid polygon.");
      return polygon.map((ring: unknown) => {
        if (!Array.isArray(ring) || ring.length < 4)
          throw new Error(
            "Polygon rings must be closed with at least four coordinates.",
          );
        const points: Position[] = ring.map((p: unknown) => {
          if (
            !Array.isArray(p) ||
            p.length < 2 ||
            !Number.isFinite(p[0]) ||
            !Number.isFinite(p[1]) ||
            Math.abs(p[0]) > 180 ||
            Math.abs(p[1]) > 90
          )
            throw new Error("Expected WGS84 decimal longitude / latitude.");
          const point: Position = [p[0], p[1]];
          bbox[0] = Math.min(bbox[0], point[0]);
          bbox[1] = Math.min(bbox[1], point[1]);
          bbox[2] = Math.max(bbox[2], point[0]);
          bbox[3] = Math.max(bbox[3], point[1]);
          return point;
        });
        if (
          points[0][0] !== points.at(-1)![0] ||
          points[0][1] !== points.at(-1)![1]
        )
          throw new Error("Polygon ring is not closed.");
        edges += points.length - 1;
        if (edges > 20000)
          throw new Error(
            "Regional map exceeds 20,000 edges; use a smaller extract.",
          );
        for (let i = 1; i < points.length; i++)
          if (Math.abs(points[i][0] - points[i - 1][0]) > 180)
            throw new Error(
              "Antimeridian polygons require a specialized map adapter.",
            );
        return points;
      });
    });
    return {
      zone,
      name:
        typeof f.properties?.name === "string"
          ? f.properties.name.slice(0, 120)
          : "Unnamed " + zone + " zone",
      polygons,
      bbox,
    };
  });
  return { source: source.trim().slice(0, 500), publishedOn, features };
}
function cross(a: Position, b: Position) {
  return a[0] * b[1] - a[1] * b[0];
}
function boundary(p: Position, a: Position, b: Position) {
  const u: Position = [b[0] - a[0], b[1] - a[1]],
    v: Position = [p[0] - a[0], p[1] - a[1]];
  return (
    Math.abs(cross(u, v)) < 1e-12 &&
    p[0] >= Math.min(a[0], b[0]) - 1e-12 &&
    p[0] <= Math.max(a[0], b[0]) + 1e-12 &&
    p[1] >= Math.min(a[1], b[1]) - 1e-12 &&
    p[1] <= Math.max(a[1], b[1]) + 1e-12
  );
}
function ringContains(p: Position, ring: Position[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (boundary(p, a, b)) return true;
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
function contains(p: Position, f: ZoneFeature) {
  return f.polygons.some(
    (polygon) =>
      ringContains(p, polygon[0]) &&
      !polygon.slice(1).some((hole) => ringContains(p, hole)),
  );
}
function intersects(
  a: Position,
  b: Position,
  c: Position,
  d: Position,
): number[] {
  const r: Position = [b[0] - a[0], b[1] - a[1]],
    s: Position = [d[0] - c[0], d[1] - c[1]],
    q: Position = [c[0] - a[0], c[1] - a[1]],
    den = cross(r, s);
  if (Math.abs(den) < 1e-15) return [];
  const t = cross(q, s) / den,
    u = cross(q, r) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [t] : [];
}
export function checkRoute(
  route: Point[],
  dataset: ZoneDataset,
): AirspaceResult {
  const zones = new Set<string>(),
    features = new Set<string>();
  let covered = route.length >= 2,
    gaps = false;
  for (let i = 1; i < route.length; i++) {
    const prev = route[i - 1],
      next = route[i];
    if (next.t - prev.t > 5) gaps = true;
    const a: Position = [prev.lon, prev.lat],
      b: Position = [next.lon, next.lat];
    const candidates = dataset.features.filter(
      (f) =>
        f.bbox[0] <= Math.max(a[0], b[0]) &&
        f.bbox[2] >= Math.min(a[0], b[0]) &&
        f.bbox[1] <= Math.max(a[1], b[1]) &&
        f.bbox[3] >= Math.min(a[1], b[1]),
    );
    const cuts = [0, 1];
    for (const f of candidates)
      for (const polygon of f.polygons)
        for (const ring of polygon)
          for (let j = 1; j < ring.length; j++)
            cuts.push(...intersects(a, b, ring[j - 1], ring[j]));
    cuts.sort((x, y) => x - y);
    const evaluate = (t: number) => {
      const p: Position = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      const hits = candidates.filter((f) => contains(p, f));
      if (!hits.length) covered = false;
      for (const f of hits) {
        zones.add(f.zone);
        features.add(f.name);
      }
    };
    evaluate(0);
    evaluate(1);
    for (let j = 1; j < cuts.length; j++)
      if (cuts[j] - cuts[j - 1] > 1e-12) evaluate((cuts[j] + cuts[j - 1]) / 2);
  }
  const most = zones.has("red")
    ? "red"
    : zones.has("yellow")
      ? "yellow"
      : covered && zones.has("green")
        ? "green"
        : "unknown";
  return {
    zones: [...zones],
    coverageComplete: covered && !gaps,
    mostRestrictive: most,
    intersectedFeatures: [...features],
    notes: [
      "Checks straight segments between logged positions against the operator-supplied regional polygons; map authenticity, vertical layers and temporary restrictions require review.",
      ...(!covered
        ? [
            "Some route sections have no zone coverage. Missing coverage is never assumed green.",
          ]
        : []),
      ...(gaps
        ? ["Position gaps over five seconds prevent complete-route evidence."]
        : []),
    ],
  };
}
