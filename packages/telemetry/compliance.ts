import type { ParsedFlight } from "./index.ts";
export type Review = {
  droneUin: string;
  pilotName: string;
  pilotRpc: string;
  rpcIssuedOn: string;
  rpcExpiresOn: string;
  purpose: string;
  incidents: string;
  takeoffUtc: string;
  landingUtc: string;
  timesConfirmed: boolean;
  verifiedAglMeters: number | null;
  altitudeEvidence: string;
  applicableCeiling: number | null;
  airspaceZone: "unknown" | "green" | "yellow" | "red";
  airspaceEvidence: string;
  permissionReference: string;
  reviewer: string;
  reviewed: boolean;
};
export type Check = {
  name: string;
  state: "pass" | "fail" | "pending";
  detail: string;
};
export function reviewChecks(flight: ParsedFlight, review: Review): Check[] {
  const date = review.takeoffUtc.slice(0, 10),
    start = Date.parse(review.takeoffUtc),
    end = Date.parse(review.landingUtc);
  const validDate = (v: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;
  let issued = false,
    expires = false;
  try {
    issued = validDate(review.rpcIssuedOn);
    expires = validDate(review.rpcExpiresOn);
  } catch {}
  const credential =
    review.pilotRpc.trim() && review.pilotName.trim() && issued && expires;
  const agl = review.verifiedAglMeters,
    ceiling = review.applicableCeiling;
  const altitude =
    agl !== null &&
    Number.isFinite(agl) &&
    agl >= 0 &&
    ceiling !== null &&
    [60, 120].includes(ceiling) &&
    review.altitudeEvidence.trim();
  const route = flight.route.length >= 2;
  const airspace =
    review.airspaceZone !== "unknown" &&
    review.airspaceEvidence.trim() &&
    route;
  return [
    {
      name: "Aircraft identity",
      state: review.droneUin.trim() ? "pass" : "pending",
      detail:
        "Operator-entered UIN; registry authenticity not independently verified.",
    },
    {
      name: "Pilot credentials",
      state: credential
        ? date >= review.rpcIssuedOn && date <= review.rpcExpiresOn
          ? "pass"
          : "fail"
        : "pending",
      detail:
        "Checks operator-entered issue/expiry dates against the flight date; certificate authenticity requires review.",
    },
    {
      name: "Flight timestamps",
      state:
        !Number.isFinite(start) || !Number.isFinite(end) || end <= start
          ? "fail"
          : review.timesConfirmed
            ? "pass"
            : "pending",
      detail:
        "Actual takeoff/landing require review; parsed arming intervals are proxies.",
    },
    {
      name: "Coordinates",
      state: route ? "pass" : "pending",
      detail: route
        ? "Position observations available; confirm takeoff and landing location samples."
        : "At least two valid route samples required.",
    },
    {
      name: "Height above ground",
      state: altitude ? (agl! <= ceiling! ? "pass" : "fail") : "pending",
      detail: altitude
        ? "Operator-reviewed maximum AGL compared with selected applicable ceiling."
        : "Relative altitude cannot establish AGL over varying terrain; add measurement evidence.",
    },
    {
      name: "Airspace & permissions",
      state: !airspace
        ? "pending"
        : review.airspaceZone === "green" || review.permissionReference.trim()
          ? "pass"
          : "fail",
      detail:
        "Operator must review the complete route, current restrictions and relevant authority permission. A reference alone does not authenticate authorization.",
    },
    {
      name: "Mission & incident record",
      state:
        review.purpose.trim() && review.incidents.trim() ? "pass" : "pending",
      detail: "Purpose and incident declaration are supplied by the operator.",
    },
    {
      name: "Reviewer sign-off",
      state: review.reviewed && review.reviewer.trim() ? "pass" : "pending",
      detail: "Operator reviewer declaration, not a digital signature.",
    },
    {
      name: "Official export format",
      state: "pending",
      detail:
        "LogSkies record pack; exact eGCA import schema and regulatory acceptance are not verified.",
    },
  ];
}
export function initialReview(flight: ParsedFlight): Review {
  return {
    droneUin: "",
    pilotName: "",
    pilotRpc: "",
    rpcIssuedOn: "",
    rpcExpiresOn: "",
    purpose: "",
    incidents: "",
    takeoffUtc: flight.startUtc ?? "",
    landingUtc: flight.endUtc ?? "",
    timesConfirmed: false,
    verifiedAglMeters: null,
    altitudeEvidence: "",
    applicableCeiling: null,
    airspaceZone: "unknown",
    airspaceEvidence: "",
    permissionReference: "",
    reviewer: "",
    reviewed: false,
  };
}
