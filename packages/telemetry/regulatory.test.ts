import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseLog } from "./index.ts";
import {
  initialReview,
  reviewChecks,
  emptyAirspaceEvidence,
  emptyOccurrence,
  occurrenceDeadline,
} from "./compliance.ts";
const b = fs.readFileSync("docs/fixtures/synthetic-flight.bin"),
  flight = parseLog(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
    "a.bin",
  ).flights[0];
const review = {
  ...initialReview(flight),
  takeoffUtc: "2026-10-05T04:00:00Z",
  landingUtc: "2026-10-05T04:30:00Z",
  airspaceZone: "green" as const,
  airspaceEvidence: "test",
  airspaceCheck: {
    ...emptyAirspaceEvidence,
    source: "DigitalSky TEST",
    checkedAtUtc: "2026-10-05T03:59:00Z",
    fullRouteConfirmed: true,
    temporaryRestrictionsConfirmed: true,
    context: "airport_8_12km" as const,
  },
  verifiedAglMeters: 70,
  applicableCeiling: 120,
  altitudeEvidence: "TEST",
};
const state = (
  r: typeof review | ReturnType<typeof initialReview>,
  name: string,
) => reviewChecks(flight, r).find((v) => v.name === name)?.state;
test("Occurrence classification must agree with the incident declaration", () => {
  assert.equal(
    state(
      {
        ...initialReview(flight),
        purpose: "Test",
        incidents: "Nil",
        occurrence: { ...emptyOccurrence, type: "accident" },
      },
      "Mission & incident record",
    ),
    "fail",
  );
});
test("Dated full-route and temporary restriction evidence is required; airport ceiling cannot be overridden with 120m", () => {
  assert.equal(state(review, "Airspace & permissions"), "pass");
  assert.equal(state(review, "Height above ground"), "fail");
  assert.equal(
    state(
      {
        ...review,
        airspaceCheck: {
          ...review.airspaceCheck,
          checkedAtUtc: "2026-10-05T04:05:00Z",
        },
      },
      "Airspace & permissions",
    ),
    "pending",
  );
  assert.equal(
    state({ ...review, airspaceCheck: undefined }, "Airspace & permissions"),
    "pending",
  );
  assert.equal(
    state(
      {
        ...review,
        airspaceZone: "red",
        permissionReference: "ATC-ref",
        airspaceCheck: { ...review.airspaceCheck, permissionAuthority: "atc" },
      },
      "Airspace & permissions",
    ),
    "fail",
  );
});
test("Occurrence deadline uses awareness plus 24h across midnight; references and local notifications cannot be assumed", () => {
  const occurrence = {
    ...emptyOccurrence,
    type: "accident" as const,
    awareAtUtc: "2026-10-05T23:30:00Z",
    aaibNotifiedAtUtc: "2026-10-06T00:00:00Z",
    aaibReference: "TEST",
    dgcaNotifiedAtUtc: "2026-10-06T00:00:00Z",
    dgcaReference: "TEST",
  };
  assert.equal(occurrenceDeadline(occurrence), "2026-10-06T23:30:00.000Z");
  assert.equal(
    occurrenceDeadline({ ...occurrence, awareAtUtc: "2026-10-05T23:30:00" }),
    null,
  );
  assert.equal(
    state({ ...review, occurrence }, "Occurrence notification evidence"),
    "pending",
  );
  const complete = {
    ...occurrence,
    districtMagistrateReference: "TEST",
    policeReference: "TEST",
  };
  assert.equal(
    state(
      { ...review, occurrence: complete },
      "Occurrence notification evidence",
    ),
    "pass",
  );
  assert.equal(
    state(
      {
        ...review,
        occurrence: { ...complete, dgcaNotifiedAtUtc: "2026-10-07T00:00:00Z" },
      },
      "Occurrence notification evidence",
    ),
    "fail",
  );
  assert.equal(
    state(
      { ...review, occurrence: { ...emptyOccurrence, type: "nil" } },
      "Occurrence notification evidence",
    ),
    "pass",
  );
});
