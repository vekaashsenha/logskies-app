import { test } from "node:test";
import assert from "node:assert/strict";
import { parseZones, checkRoute } from "./airspace.ts";
const feature = (zone: string, ring: number[][]) => ({
  type: "Feature",
  properties: { zone, name: zone },
  geometry: { type: "Polygon", coordinates: [ring] },
});
const square = (left: number, right: number) => [
  [left, 0],
  [right, 0],
  [right, 1],
  [left, 1],
  [left, 0],
];
const route = (from: number, to: number) => [
  { t: 0, lat: 0.5, lon: from, alt: 0, relative: 0 },
  { t: 1, lat: 0.5, lon: to, alt: 0, relative: 0 },
];
test("Route crossing a red polygon is detected even with both endpoints outside", () => {
  const data = parseZones(
    {
      type: "FeatureCollection",
      features: [feature("green", square(0, 10)), feature("red", square(4, 6))],
    },
    "TEST MAP",
    "2026-10-01",
  );
  const result = checkRoute(route(1, 9), data);
  assert.equal(result.mostRestrictive, "red");
  assert.equal(result.coverageComplete, true);
});
test("Missing coverage is unknown and holes remain uncovered", () => {
  const f = feature("green", square(0, 10));
  f.geometry.coordinates.push(square(4, 6));
  const result = checkRoute(
    route(1, 9),
    parseZones(
      { type: "FeatureCollection", features: [f] },
      "TEST MAP",
      "2026-10-01",
    ),
  );
  assert.equal(result.coverageComplete, false);
  assert.equal(result.mostRestrictive, "unknown");
});
test("Unknown zones and invalid geometries cannot become green", () => {
  assert.throws(() =>
    parseZones(
      { type: "FeatureCollection", features: [feature("blue", square(0, 1))] },
      "TEST",
      "2026-10-01",
    ),
  );
  assert.throws(() =>
    parseZones(
      { type: "FeatureCollection", features: [] },
      "TEST",
      "2026-10-01",
    ),
  );
});
