import type { ParsedFlight } from "./index.ts";
export type AirspaceEvidence = {
  checkedAtUtc: string;
  source: string;
  fullRouteConfirmed: boolean;
  temporaryRestrictionsConfirmed: boolean;
  context: "unknown" | "general_green" | "airport_8_12km" | "restricted";
  permissionAuthority: "unknown" | "atc" | "central_government";
};
export type Occurrence = {
  type: "unknown" | "nil" | "incident" | "serious_incident" | "accident";
  awareAtUtc: string;
  injuriesDamage: string;
  location: string;
  dangerousGoods: string;
  aaibNotifiedAtUtc: string;
  aaibReference: string;
  dgcaNotifiedAtUtc: string;
  dgcaReference: string;
  districtMagistrateReference: string;
  policeReference: string;
  droneRulesReference: string;
};
export type EvidenceAttachment = {
  hash: string;
  filename: string;
  bytes: number;
  kind: "airspace" | "permission" | "occurrence";
};
export const emptyAirspaceEvidence: AirspaceEvidence = {
  checkedAtUtc: "",
  source: "",
  fullRouteConfirmed: false,
  temporaryRestrictionsConfirmed: false,
  context: "unknown",
  permissionAuthority: "unknown",
};
export const emptyOccurrence: Occurrence = {
  type: "unknown",
  awareAtUtc: "",
  injuriesDamage: "",
  location: "",
  dangerousGoods: "",
  aaibNotifiedAtUtc: "",
  aaibReference: "",
  dgcaNotifiedAtUtc: "",
  dgcaReference: "",
  districtMagistrateReference: "",
  policeReference: "",
  droneRulesReference: "",
};
export function occurrenceDeadline(occurrence: Occurrence): string | null {
  const aware = parseUtc(occurrence.awareAtUtc);
  return Number.isFinite(aware)
    ? new Date(aware + 24 * 3600000).toISOString()
    : null;
}
function parseUtc(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value))
    return NaN;
  const t = Date.parse(value);
  return Number.isFinite(t) &&
    new Date(t).toISOString().slice(0, 19) === value.slice(0, 19)
    ? t
    : NaN;
}
export function regulatoryEvidenceRows(review: Review): [string, string][] {
  const a = review.airspaceCheck ?? emptyAirspaceEvidence,
    o = review.occurrence ?? emptyOccurrence;
  const rows: [string, string][] = [
    ["Airspace checked UTC", a.checkedAtUtc],
    ["Airspace source", a.source],
    ["Airspace context", a.context],
    [
      "Full route checked",
      a.fullRouteConfirmed ? "Operator confirmed" : "Pending",
    ],
    [
      "Temporary restrictions checked",
      a.temporaryRestrictionsConfirmed ? "Operator confirmed" : "Pending",
    ],
    ["Permission authority", a.permissionAuthority],
    ["Occurrence classification (operator)", o.type],
  ];
  if (o.type !== "nil")
    rows.push(
      ["Awareness UTC", o.awareAtUtc],
      ["24-hour outer deadline UTC", occurrenceDeadline(o) ?? "Pending"],
      ["Occurrence location", o.location],
      ["Injuries / damage", o.injuriesDamage],
      ["Dangerous goods", o.dangerousGoods],
      [
        "AAIB notified UTC / reference",
        o.aaibNotifiedAtUtc + " / " + o.aaibReference,
      ],
      [
        "DGCA notified UTC / reference",
        o.dgcaNotifiedAtUtc + " / " + o.dgcaReference,
      ],
      ["District Magistrate reference", o.districtMagistrateReference],
      ["Police reference", o.policeReference],
      ["Drone Rules submission reference", o.droneRulesReference],
    );
  rows.push([
    "Supporting attachment manifest",
    (review.attachments ?? [])
      .map(
        (v) => `${v.kind}: ${v.filename} (${v.bytes} bytes), SHA-256 ${v.hash}`,
      )
      .join("; "),
  ]);
  return rows;
}
export type Review = {
  airspaceCheck?: AirspaceEvidence;
  occurrence?: Occurrence;
  attachments?: EvidenceAttachment[];
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
  const evidence = review.airspaceCheck ?? emptyAirspaceEvidence;
  const checked = parseUtc(evidence.checkedAtUtc);
  const airspace =
    review.airspaceZone !== "unknown" &&
    review.airspaceEvidence.trim() &&
    route &&
    evidence.source.trim() &&
    Number.isFinite(checked) &&
    checked <= start &&
    evidence.fullRouteConfirmed &&
    evidence.temporaryRestrictionsConfirmed;
  const permission =
    review.airspaceZone === "green" ||
    (!!review.permissionReference.trim() &&
      evidence.permissionAuthority ===
        (review.airspaceZone === "yellow" ? "atc" : "central_government"));
  const ceilingContext =
    evidence.context === "airport_8_12km"
      ? 60
      : evidence.context === "general_green"
        ? 120
        : null;
  const occurrence = review.occurrence ?? emptyOccurrence;
  const deadline = occurrenceDeadline(occurrence);
  const aware = parseUtc(occurrence.awareAtUtc);
  const aaib = parseUtc(occurrence.aaibNotifiedAtUtc),
    dgca = parseUtc(occurrence.dgcaNotifiedAtUtc);
  const notifications =
    deadline &&
    aaib >= aware &&
    dgca >= aware &&
    occurrence.aaibReference.trim() &&
    occurrence.dgcaReference.trim();
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
      state:
        altitude && ceilingContext !== null
          ? ceiling === ceilingContext && agl! <= ceiling!
            ? "pass"
            : "fail"
          : "pending",
      detail: altitude
        ? "Operator-reviewed maximum AGL compared with selected applicable ceiling."
        : "Relative altitude cannot establish AGL over varying terrain; add measurement evidence.",
    },
    {
      name: "Airspace & permissions",
      state: !airspace ? "pending" : permission ? "pass" : "fail",
      detail:
        "Requires a dated preflight check of the full route and temporary restrictions. Yellow requires ATC; red requires Central Government authorization. Operator entries and attachments do not authenticate permission.",
    },
    {
      name: "Mission & incident record",
      state:
        occurrence.type !== "unknown" &&
        (occurrence.type === "nil") !==
          (review.incidents.trim().toLowerCase() === "nil")
          ? "fail"
          : review.purpose.trim() &&
              review.incidents.trim() &&
              occurrence.type !== "unknown"
            ? "pass"
            : "pending",
      detail:
        "Purpose and incident declaration are supplied by the operator. A Nil declaration must agree with the occurrence classification.",
    },
    {
      name: "Occurrence notification evidence",
      state:
        occurrence.type === "nil"
          ? "pass"
          : occurrence.type === "unknown"
            ? "pending"
            : !notifications
              ? "pending"
              : aaib > Date.parse(deadline!) || dgca > Date.parse(deadline!)
                ? "fail"
                : (occurrence.type === "accident" ||
                      occurrence.type === "serious_incident") &&
                    (!occurrence.districtMagistrateReference.trim() ||
                      !occurrence.policeReference.trim())
                  ? "pending"
                  : "pass",
      detail:
        occurrence.type === "nil"
          ? "Operator declares no occurrence; telemetry does not independently establish this."
          : "For covered occurrences, 2025 Rule 4 requires notice as soon as reasonably practicable, at most 24 hours after awareness. Accidents/serious incidents in India also require local authority information. Drone Rules Rule 30 separately specifies accident reporting within 48 hours of occurrence. These are operator-entered evidence checks, not submission or legal classification.",
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
    airspaceCheck: { ...emptyAirspaceEvidence },
    occurrence: { ...emptyOccurrence },
    attachments: [],
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
