"use client";
import {
  emptyAirspaceEvidence,
  emptyOccurrence,
  occurrenceDeadline,
  type Review,
  type Occurrence,
} from "@logskies/telemetry/compliance";
export default function RegulatoryEvidence({
  value,
  onChange,
}: {
  value: Review;
  onChange: (value: Review) => void;
}) {
  const air = value.airspaceCheck ?? emptyAirspaceEvidence,
    occurrence = value.occurrence ?? emptyOccurrence;
  const airChange = (patch: Partial<typeof air>) =>
    onChange({ ...value, airspaceCheck: { ...air, ...patch } });
  const occurrenceChange = (patch: Partial<Occurrence>) =>
    onChange({ ...value, occurrence: { ...occurrence, ...patch } });
  const fields: [keyof Occurrence, string][] = [
    ["awareAtUtc", "Awareness time (UTC)"],
    ["location", "Occurrence location / coordinates"],
    ["injuriesDamage", "Known injuries and damage"],
    ["dangerousGoods", "Dangerous goods / payload (enter Nil if none)"],
    ["aaibNotifiedAtUtc", "AAIB notification time (UTC)"],
    ["aaibReference", "AAIB receipt / communication reference"],
    ["dgcaNotifiedAtUtc", "DGCA notification time (UTC)"],
    ["dgcaReference", "DGCA receipt / communication reference"],
    [
      "districtMagistrateReference",
      "District Magistrate notification reference (India accident/serious incident)",
    ],
    [
      "policeReference",
      "Nearest police station notification reference (India accident/serious incident)",
    ],
    ["droneRulesReference", "Drone Rules accident-report submission reference"],
  ];
  return (
    <>
      <h3>Airspace check evidence</h3>
      <p className="muted">
        Check the official{" "}
        <a
          href="https://digitalsky.aai.aero/digital-sky-map"
          target="_blank"
          rel="noreferrer"
        >
          DigitalSky map
        </a>{" "}
        before flight. LogSkies does not fetch authoritative live restrictions
        or issue flight permission.
      </p>
      <div className="form-row">
        <label>
          Preflight airspace check time (UTC)
          <input
            value={air.checkedAtUtc}
            placeholder="2026-10-05T03:30:00Z"
            maxLength={40}
            onChange={(e) => airChange({ checkedAtUtc: e.target.value })}
          />
        </label>
        <label>
          Official map source / version / reference
          <input
            value={air.source}
            maxLength={1000}
            onChange={(e) => airChange({ source: e.target.value })}
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Applicable airspace context
          <select
            value={air.context}
            onChange={(e) =>
              airChange({ context: e.target.value as typeof air.context })
            }
          >
            <option value="unknown">Needs review</option>
            <option value="general_green">General green zone — 120 m</option>
            <option value="airport_8_12km">
              8–12 km from operational airport perimeter — 60 m
            </option>
            <option value="restricted">
              Restricted / permission-specific — manual review
            </option>
          </select>
        </label>
        <label>
          Permission issuing authority
          <select
            value={air.permissionAuthority}
            onChange={(e) =>
              airChange({
                permissionAuthority: e.target
                  .value as typeof air.permissionAuthority,
              })
            }
          >
            <option value="unknown">Not established / not applicable</option>
            <option value="atc">Air Traffic Control (yellow)</option>
            <option value="central_government">Central Government (red)</option>
          </select>
        </label>
      </div>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={air.fullRouteConfirmed}
          onChange={(e) => airChange({ fullRouteConfirmed: e.target.checked })}
        />
        I checked the intended full route and applicable vertical limits.
      </label>
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={air.temporaryRestrictionsConfirmed}
          onChange={(e) =>
            airChange({ temporaryRestrictionsConfirmed: e.target.checked })
          }
        />
        I checked temporary restrictions applicable at the flight time.
      </label>
      <h3>Occurrence and notification evidence</h3>
      <label>
        Operator occurrence classification
        <select
          value={occurrence.type}
          onChange={(e) =>
            occurrenceChange({ type: e.target.value as Occurrence["type"] })
          }
        >
          <option value="unknown">Not declared</option>
          <option value="nil">Nil — no occurrence declared</option>
          <option value="incident">Incident</option>
          <option value="serious_incident">Serious incident</option>
          <option value="accident">Accident</option>
        </select>
      </label>
      {occurrence.type !== "nil" && occurrence.type !== "unknown" && (
        <>
          <p className="notice">
            For covered occurrences, notify AAIB and DGCA as soon as reasonably
            practicable, no later than 24 hours after awareness. Do not wait for
            a complete report. India accidents/serious incidents also require
            local authority information. Drone Rules separately require accident
            reporting within 48 hours of occurrence. Verify applicability and
            official channels; saving here does not notify authorities.
          </p>
          <p>
            24-hour outer deadline from entered awareness time:{" "}
            <strong>
              {occurrenceDeadline(occurrence) ??
                "Enter a valid UTC awareness time"}
            </strong>
          </p>
          <div className="form-row">
            {fields.map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  maxLength={1000}
                  value={occurrence[key]}
                  placeholder={
                    key.endsWith("Utc") ? "2026-10-05T03:30:00Z" : undefined
                  }
                  onChange={(e) => occurrenceChange({ [key]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <p className="muted">
            Preserve the aircraft, controller, original telemetry and related
            recordings/documents. Classification and acceptance remain with the
            authorities. These entries are operator declarations.
          </p>
        </>
      )}
    </>
  );
}
