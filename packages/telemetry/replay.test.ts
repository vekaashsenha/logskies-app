import { test } from "node:test";
import assert from "node:assert/strict";
import { segments, observedAt, projectRoute } from "./replay.ts";
test("Replay preserves GPS gaps, invalid readings and clock rollback as separate segments", () => {
  const samples = [
    { t: 0, v: 1 },
    { t: 1, v: 2 },
    { t: 8, v: 3 },
    { t: 9, v: null },
    { t: 10, v: 4 },
    { t: 7, v: 5 },
  ];
  assert.deepEqual(
    segments(samples, (p) => p.v !== null).map((s) => s.map((p) => p.t)),
    [[0, 1], [8], [10], [7]],
  );
  assert.equal(observedAt([{ t: 0 }, { t: 10 }], 7), null);
  assert.equal(observedAt([{ t: 0 }, { t: 10 }], 0)?.t, 0);
  assert.equal(observedAt([{ t: 0 }, { t: 10 }], 9), null);
});
test("Coordinate map preserves north/east orientation, stationary routes and the date line", () => {
  const p = (lat: number, lon: number, t = 0) => ({
    lat,
    lon,
    t,
    alt: null,
    relative: null,
  });
  const route = projectRoute([p(18, 73), p(18.001, 73.001, 1)])!;
  assert.ok(route[1].x > route[0].x);
  assert.ok(route[1].y < route[0].y);
  assert.ok(
    projectRoute([p(18, 73), p(18, 73)])!.every(
      (p) => Number.isFinite(p.x) && Number.isFinite(p.y),
    ),
  );
  const crossing = projectRoute([p(0, 179.999), p(0, -179.999)])!;
  assert.ok(crossing[1].east < 300 && crossing[1].east > 0);
});
