import type { Point } from "./index.ts";

// Display policy, not a diagnosis of packet loss or aircraft performance.
export const OBSERVATION_GAP_SECONDS = 5;
export function segments<T extends { t: number }>(
  samples: T[],
  valid: (sample: T) => boolean,
): T[][] {
  const result: T[][] = [];
  let active: T[] = [];
  for (const sample of samples) {
    const previous = active.at(-1);
    if (!valid(sample) || !Number.isFinite(sample.t)) {
      active = [];
      continue;
    }
    if (
      !previous ||
      sample.t - previous.t > OBSERVATION_GAP_SECONDS ||
      sample.t < previous.t
    ) {
      active = [];
      result.push(active);
    }
    active.push(sample);
  }
  return result;
}
export function observedAt<T extends { t: number }>(
  samples: T[],
  time: number,
): T | null {
  let low = 0,
    high = samples.length - 1,
    found = -1;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (samples[mid].t <= time) {
      found = mid;
      low = mid + 1;
    } else high = mid - 1;
  }
  const point = samples[found];
  return point && time - point.t <= OBSERVATION_GAP_SECONDS ? point : null;
}
export function projectRoute(points: Point[]) {
  if (!points.length) return null;
  const origin = points[0];
  const longitudeScale = Math.max(
    0.000001,
    Math.cos((origin.lat * Math.PI) / 180),
  );
  const local = points.map((p) => ({
    ...p,
    east: (((p.lon - origin.lon + 540) % 360) - 180) * 111320 * longitudeScale,
    north: (p.lat - origin.lat) * 111320,
  }));
  const east = local.map((p) => p.east),
    north = local.map((p) => p.north);
  const minE = Math.min(...east),
    maxE = Math.max(...east),
    minN = Math.min(...north),
    maxN = Math.max(...north);
  const scale = Math.min(
    640 / Math.max(20, maxE - minE),
    260 / Math.max(20, maxN - minN),
  );
  return local.map((p) => ({
    ...p,
    x: 360 + (p.east - (minE + maxE) / 2) * scale,
    y: 180 - (p.north - (minN + maxN) / 2) * scale,
  }));
}
