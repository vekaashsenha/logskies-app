"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  batteryStatus,
  csvCell,
  matchSession,
  type Battery,
  type Session,
  type Drone,
} from "@logskies/domain";
import type { ParsedLog } from "@logskies/telemetry";
import { estimateHealth } from "@logskies/telemetry/health";
import {
  initialReview,
  reviewChecks,
  regulatoryEvidenceRows,
  type Review,
  type EvidenceAttachment,
} from "@logskies/telemetry/compliance";
import {
  listFlights,
  saveFlights,
  readSource,
  type FlightRecord,
} from "@/lib/flight-storage";
import AirspaceReview from "./airspace-review";
import FlightReplay from "./flight-replay";
import RegulatoryEvidence from "./regulatory-evidence";
const droneIdentity = "demo-drone-01";
const localStore = { listFlights, saveFlights, readSource };
export type FlightStore = typeof localStore;
function download(data: Blob, filename: string) {
  const trigger = (url: string) => {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };
  if (data.size <= 2 * 1024 * 1024) {
    const reader = new FileReader();
    reader.onload = () => trigger(String(reader.result));
    reader.readAsDataURL(data);
  } else {
    const url = URL.createObjectURL(data);
    trigger(url);
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
}
const display = (value: number | null, digits = 2) =>
  value === null ? "Unavailable" : value.toFixed(digits);
const purposes = [
  "agriculture_spraying",
  "mapping_survey",
  "infrastructure_inspection",
  "training_instruction",
  "surveillance",
  "rnd_test_flight",
  "delivery",
];
export default function FlightWorkbench({
  batteries,
  sessions,
  company,
  logo,
  reportOnly = false,
  store = localStore,
  drones,
  canEdit = true,
}: {
  batteries: Battery[];
  sessions: Session[];
  company: string;
  logo: string;
  reportOnly?: boolean;
  store?: FlightStore;
  drones?: Drone[];
  canEdit?: boolean;
}) {
  const [records, setRecords] = useState<FlightRecord[]>([]),
    [selected, setSelected] = useState(""),
    [draft, setDraft] = useState<FlightRecord | null>(null);
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [system, setSystem] = useState(""),
    [sourceDrone, setSourceDrone] = useState(
      drones?.[0]?.id ?? (drones ? "" : droneIdentity),
    );
  const [attachmentKind, setAttachmentKind] =
    useState<EvidenceAttachment["kind"]>("permission");
  useEffect(() => {
    let active = true;
    store
      .listFlights()
      .then((items) => {
        if (active) {
          setRecords(items);
          setSelected(items[0]?.id ?? "");
          setDraft(items[0] ?? null);
        }
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      });
    return () => {
      active = false;
    };
  }, [store]);
  const battery = batteries.find((b) => b.id === draft?.batteryId);
  const rawHealth = draft
    ? estimateHealth(draft.flight.batteries, draft.healthInputs)
    : null;
  const health =
    rawHealth && battery && !battery.chemistry.startsWith("LiPo")
      ? {
          ...rawHealth,
          health: null,
          reasons: [
            ...rawHealth.reasons,
            "The current weighted health model is only configured for LiPo; this chemistry remains unassessed.",
          ],
        }
      : rawHealth;
  const checks = draft ? reviewChecks(draft.flight, draft.review) : [];
  const reportBlocked =
    !!draft &&
    ((draft.format === "MAVLink" &&
      draft.parserVersion === "logskies-browser-1.0") ||
      !Number.isFinite(draft.flight.durationMinutes) ||
      draft.flight.durationMinutes <= 0);
  if (draft?.airspace)
    checks.push({
      name: "Imported regional map geometry",
      state: !draft.airspace.result.coverageComplete
        ? "pending"
        : draft.airspace.result.mostRestrictive !== draft.review.airspaceZone
          ? "fail"
          : "pass",
      detail:
        "Observed route intersection only. Map source: " +
        draft.airspace.dataset.source +
        " · " +
        draft.airspace.dataset.publishedOn +
        ". Vertical limits, map authenticity and temporary restrictions need operator review.",
    });
  function select(id: string) {
    setSelected(id);
    setDraft(records.find((record) => record.id === id) ?? null);
    setMessage("");
  }
  function review<K extends keyof Review>(key: K, value: Review[K]) {
    if (draft)
      setDraft({ ...draft, review: { ...draft.review, [key]: value } });
  }
  async function importFile(file?: File) {
    if (!file) return;
    if (drones && !drones.some((d) => d.id === sourceDrone)) {
      setMessage("Select a registered source drone before importing.");
      return;
    }
    if (
      !/\.(bin|tlog|ulg)$/i.test(file.name) ||
      file.size === 0 ||
      file.size > 50 * 1024 * 1024
    ) {
      setMessage("Choose a nonempty .bin, .tlog or .ulg file under 50 MB.");
      return;
    }
    if (
      system &&
      (!/^\d+$/.test(system) || Number(system) < 1 || Number(system) > 255)
    ) {
      setMessage("MAVLink system ID must be between 1 and 255.");
      return;
    }
    setBusy(true);
    setMessage("Reading and validating telemetry locally…");
    try {
      const buffer = await file.arrayBuffer();
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)),
      )
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      const existing = await store.listFlights();
      if (existing.some((record) => record.sourceHash === hash))
        throw new Error(
          "This exact source log has already been imported. Open its existing flight record.",
        );
      const parsed = await new Promise<ParsedLog>((resolve, reject) => {
        const worker = new Worker(
          new URL("./flight-parser.worker.ts", import.meta.url),
        );
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(
            new Error("Log parsing exceeded 60 seconds. Split this file."),
          );
        }, 60000);
        worker.onmessage = (event) => {
          clearTimeout(timeout);
          worker.terminate();
          if (event.data.error) reject(new Error(event.data.error));
          else resolve(event.data.result);
        };
        worker.onerror = () => {
          clearTimeout(timeout);
          worker.terminate();
          reject(
            new Error("Parser worker failed to start or encountered an error."),
          );
        };
        worker.postMessage({
          buffer,
          filename: file.name,
          systemId: system ? Number(system) : undefined,
        });
      });
      const claimed = new Set(
        existing.map((record) =>
          record.matchMethod.startsWith("Session ")
            ? record.matchMethod.slice(8)
            : "",
        ),
      );
      const imported = parsed.flights.map((flight) => {
        const match =
          flight.startUtc &&
          flight.complete &&
          flight.boundary === "armed interval"
            ? matchSession(
                sessions.filter((session) => !claimed.has(session.id)),
                sourceDrone,
                flight.startUtc,
              )
            : null;
        if (match) claimed.add(match.id);
        const pack = batteries.find((b) => b.id === match?.batteryId);
        return {
          id: crypto.randomUUID(),
          filename: file.name,
          sourceHash: hash,
          sourceBytes: file.size,
          importedAt: new Date().toISOString(),
          parserVersion: parsed.parserVersion,
          format: parsed.format,
          systemId: parsed.systemId,
          flight,
          batteryId: pack?.id ?? "",
          droneId: sourceDrone,
          matchMethod: match
            ? "Session " + match.id
            : "Manual selection required",
          healthInputs: {
            ratedMah: pack?.capacityMah ?? 16000,
            cycles: pack?.cycles ?? -1,
            instance: 0,
            baselineResistanceOhms: null,
            expectedDeliveredMah: null,
            capacityTestConfirmed: false,
            comparableConditionsConfirmed: false,
          },
          review: {
            ...initialReview(flight),
            droneUin: drones?.find((d) => d.id === sourceDrone)?.uin ?? "",
          },
        } satisfies FlightRecord;
      });
      if (!imported.length)
        throw new Error("No flight intervals found in this log.");
      await store.saveFlights(imported, { hash, buffer, filename: file.name });
      const next = [...imported, ...existing];
      setRecords(next);
      setSelected(imported[0].id);
      setDraft(imported[0]);
      setMessage(
        parsed.messages +
          " data messages processed; " +
          imported.length +
          (drones
            ? " interval(s) saved to your organization with the private original source. Review flight boundaries and evidence."
            : " interval(s) saved locally with the original source. Review flight boundaries and evidence."),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!draft) return;
    setBusy(true);
    try {
      await store.saveFlights([draft]);
      setRecords(
        records.map((record) => (record.id === draft.id ? draft : record)),
      );
      setMessage(
        drones
          ? "Flight review saved to your organization."
          : "Flight review saved in this browser.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  async function attachEvidence(file?: File) {
    if (!file || !draft || busy || !canEdit) return;
    if (
      file.size === 0 ||
      file.size > 5 * 1024 * 1024 ||
      (draft.review.attachments ?? []).length >= 10
    ) {
      setMessage("Attach up to 10 PDF, PNG or JPEG files, each under 5 MB.");
      return;
    }
    setBusy(true);
    try {
      const buffer = await file.arrayBuffer(),
        bytes = new Uint8Array(buffer);
      const pdf = new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-";
      const png = [137, 80, 78, 71, 13, 10, 26, 10].every(
        (b, i) => bytes[i] === b,
      );
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      if (!(
        (pdf && /\.pdf$/i.test(file.name)) ||
        (png && /\.png$/i.test(file.name)) ||
        (jpeg && /\.jpe?g$/i.test(file.name))
      ))
        throw new Error("Choose a genuine PDF, PNG or JPEG evidence file.");
      const hash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)),
      )
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if ((draft.review.attachments ?? []).some((v) => v.hash === hash))
        throw new Error("This evidence file is already attached.");
      const updated = {
        ...draft,
        review: {
          ...draft.review,
          attachments: [
            ...(draft.review.attachments ?? []),
            {
              hash,
              filename: file.name,
              bytes: file.size,
              kind: attachmentKind,
            },
          ],
        },
      };
      await store.saveFlights([updated], { hash, buffer, filename: file.name });
      setDraft(updated);
      setRecords(records.map((v) => (v.id === updated.id ? updated : v)));
      setMessage(
        "Review and supporting evidence saved privately. Attachment content is not authenticated by LogSkies.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Attachment save failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  function exportCsv() {
    if (!draft || !health) return "";
    const start = Date.parse(draft.review.takeoffUtc),
      end = Date.parse(draft.review.landingUtc);
    const point = draft.flight.route[0],
      last = draft.flight.route[draft.flight.route.length - 1];
    const rows = [
      [
        "Report status",
        "Flight date IST",
        "Drone UIN",
        "Pilot RPC",
        "Takeoff UTC",
        "Landing UTC",
        "Takeoff IST",
        "Landing IST",
        "Duration minutes",
        "Takeoff latitude",
        "Takeoff longitude",
        "Landing latitude",
        "Landing longitude",
        "Max AGL metres (reviewed)",
        "Max relative altitude metres (telemetry)",
        "Purpose",
        "Incidents",
        "Battery",
        "Consumed mAh",
        "Health estimate",
        "Airspace zone",
        "Permission reference",
        "Reviewer",
        "Source SHA-256",
        "Parser version",
      ],
      [
        "DRAFT - official export format pending",
        Number.isFinite(start)
          ? new Date(start)
              .toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" })
              .replaceAll("/", "-")
          : "",
        draft.review.droneUin,
        draft.review.pilotRpc,
        draft.review.takeoffUtc,
        draft.review.landingUtc,
        Number.isFinite(start)
          ? new Date(start).toLocaleString("en-GB", {
              timeZone: "Asia/Kolkata",
            })
          : "",
        Number.isFinite(end)
          ? new Date(end).toLocaleString("en-GB", { timeZone: "Asia/Kolkata" })
          : "",
        Number.isFinite(start) && Number.isFinite(end)
          ? ((end - start) / 60000).toFixed(2)
          : "",
        point?.lat.toFixed(4) ?? "",
        point?.lon.toFixed(4) ?? "",
        last?.lat.toFixed(4) ?? "",
        last?.lon.toFixed(4) ?? "",
        draft.review.verifiedAglMeters?.toString() ?? "",
        draft.flight.maxRelativeAltitude?.toFixed(2) ?? "",
        draft.review.purpose,
        draft.review.incidents,
        battery?.tag ?? "",
        health.consumedMah?.toFixed(2) ?? "",
        health.health?.toFixed(2) ?? "",
        draft.review.airspaceZone,
        draft.review.permissionReference,
        draft.review.reviewer,
        draft.sourceHash,
        draft.parserVersion,
      ],
    ];
    const evidence = regulatoryEvidenceRows(draft.review);
    rows[0].push(...evidence.map(([label]) => label));
    rows[1].push(...evidence.map(([, value]) => value));
    return (
      "data:text/csv;charset=utf-8," +
      encodeURIComponent(
        "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n"),
      )
    );
  }
  return (
    <div className="flight-workbench">
      {!reportOnly && canEdit && (
        <section className="panel form-grid no-print">
          <h2>Import a real flight log</h2>
          <p className="muted">
            ArduPilot .bin, MAVLink .tlog and PX4 .ulg position/battery
            evidence.
            {drones
              ? "Parsing runs on your device; original logs and review records are saved privately to your organization."
              : "Processing and original-file storage stay in this browser."}{" "}
            Maximum 50 MB per file.
          </p>
          <div className="form-row">
            <label>
              Source drone
              <select
                value={sourceDrone}
                onChange={(e) => setSourceDrone(e.target.value)}
              >
                {drones ? (
                  <>
                    <option value="">Select source drone</option>
                    {drones.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} · {d.uin || "UIN not set"}
                      </option>
                    ))}
                  </>
                ) : (
                  <option value={droneIdentity}>
                    Local aircraft — enter its actual UIN during review
                  </option>
                )}
              </select>
            </label>
            <label>
              MAVLink aircraft system ID (optional)
              <input
                type="number"
                min="1"
                max="255"
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                placeholder="Needed for logs containing multiple aircraft"
              />
            </label>
          </div>
          <label>
            Flight log file
            <input
              disabled={busy}
              type="file"
              accept=".bin,.tlog,.ulg"
              onChange={(e) => {
                importFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <p className="fine-print">
            Battery channels remain separate. UIN and physical battery serial
            numbers are supplied by the operator, not inferred from telemetry.
          </p>
        </section>
      )}
      {message && (
        <p className="notice no-print" role="status">
          {message}
        </p>
      )}
      <section className="panel no-print">
        <h2>Flight record history</h2>
        <button
          className="secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const items = await store.listFlights();
              const current =
                items.find((item) => item.id === selected) ?? items[0] ?? null;
              setRecords(items);
              setSelected(current?.id ?? "");
              setDraft(current);
              setMessage(
                "Saved flight history refreshed. Unsaved edits were discarded.",
              );
            } catch (error) {
              setMessage(
                error instanceof Error
                  ? error.message
                  : "History refresh failed.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Refresh saved flight history
        </button>
        {records.length ? (
          <label>
            Select a saved interval
            <select value={selected} onChange={(e) => select(e.target.value)}>
              {records.map((record) => (
                <option key={record.id} value={record.id}>
                  {record.filename} · interval {record.flight.index + 1} ·{" "}
                  {record.flight.startUtc ?? "UTC unknown"}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p>
            No real logs imported yet. Open Flight logs to import a .bin or
            .tlog or .ulg.
          </p>
        )}
      </section>
      {draft && health && (
        <>
          <section className="panel no-print">
            <h2>Parsed interval · {draft.flight.boundary}</h2>
            <div className="stats">
              <div>
                <small>Interval duration</small>
                <strong>{draft.flight.durationMinutes.toFixed(2)} min</strong>
              </div>
              <div>
                <small>Maximum relative altitude</small>
                <strong>{display(draft.flight.maxRelativeAltitude)} m</strong>
              </div>
              <div>
                <small>Consumed capacity</small>
                <strong>{display(health.consumedMah)} mAh</strong>
              </div>
              <div>
                <small>Selected battery channel</small>
                <strong>{draft.healthInputs.instance}</strong>
              </div>
            </div>
            <details>
              <summary>Parser evidence and limitations</summary>
              <ul>
                {draft.flight.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
              <p>
                Format: {draft.format} · Parser: {draft.parserVersion} · MAVLink
                system: {draft.systemId ?? "N/A"}
              </p>
            </details>
            {reportBlocked ? (
              <p>Re-import this log to validate timing before replay.</p>
            ) : (
              <FlightReplay
                key={`${draft.id}-${draft.healthInputs.instance}`}
                flight={draft.flight}
                instance={draft.healthInputs.instance}
              />
            )}
          </section>
          <section className="panel form-grid no-print">
            <h2>Battery matching & health estimate</h2>
            <p>
              {draft.matchMethod.startsWith("Session ")
                ? "Matched to one unclaimed scan within 30 minutes of the arming proxy. Confirm the physical pack."
                : draft.matchMethod}
            </p>
            <label>
              Battery used
              <select
                value={draft.batteryId}
                onChange={(e) => {
                  const pack = batteries.find((b) => b.id === e.target.value);
                  setDraft({
                    ...draft,
                    batteryId: e.target.value,
                    matchMethod: "Operator selected",
                    healthInputs: {
                      ...draft.healthInputs,
                      ratedMah: pack?.capacityMah ?? 16000,
                      cycles: pack?.cycles ?? -1,
                      baselineResistanceOhms: null,
                      expectedDeliveredMah: null,
                      capacityTestConfirmed: false,
                      comparableConditionsConfirmed: false,
                    },
                  });
                }}
              >
                <option value="">Select the physical battery</option>
                {batteries.map((pack) => (
                  <option key={pack.id} value={pack.id}>
                    {pack.tag}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-row">
              <label>
                Battery telemetry channel
                <select
                  value={draft.healthInputs.instance}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      healthInputs: {
                        ...draft.healthInputs,
                        instance: Number(e.target.value),
                      },
                    })
                  }
                >
                  {[
                    ...new Set([
                      0,
                      ...draft.flight.batteries.map(
                        (sample) => sample.instance,
                      ),
                    ]),
                  ]
                    .sort((a, b) => a - b)
                    .map((instance) => (
                      <option key={instance} value={instance}>
                        {instance}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Cycle count
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={
                    draft.healthInputs.cycles < 0
                      ? ""
                      : draft.healthInputs.cycles
                  }
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      healthInputs: {
                        ...draft.healthInputs,
                        cycles:
                          e.target.value === "" ? -1 : Number(e.target.value),
                      },
                    })
                  }
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Baseline pack resistance (ohms)
                <input
                  type="number"
                  min=".000001"
                  step=".000001"
                  value={draft.healthInputs.baselineResistanceOhms ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      healthInputs: {
                        ...draft.healthInputs,
                        baselineResistanceOhms: e.target.value
                          ? Number(e.target.value)
                          : null,
                      },
                    })
                  }
                />
              </label>
              <label>
                Expected delivered capacity at cutoff (mAh)
                <input
                  type="number"
                  min="1"
                  max={draft.healthInputs.ratedMah}
                  value={draft.healthInputs.expectedDeliveredMah ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      healthInputs: {
                        ...draft.healthInputs,
                        expectedDeliveredMah: e.target.value
                          ? Number(e.target.value)
                          : null,
                      },
                    })
                  }
                />
              </label>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={draft.healthInputs.capacityTestConfirmed}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    healthInputs: {
                      ...draft.healthInputs,
                      capacityTestConfirmed: e.target.checked,
                    },
                  })
                }
              />
              This interval covers a comparable start-to-cutoff discharge; I
              verified the expected capacity.
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={draft.healthInputs.comparableConditionsConfirmed}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    healthInputs: {
                      ...draft.healthInputs,
                      comparableConditionsConfirmed: e.target.checked,
                    },
                  })
                }
              />
              The resistance baseline has comparable temperature and state of
              charge.
            </label>
            <div className="notice">
              <strong>
                {draft.batteryId
                  ? batteryStatus(health.health)
                  : "Select a battery before using this estimate"}
                {draft.batteryId && health.health !== null
                  ? ` · ${health.health}%`
                  : ""}
              </strong>
              <p>
                Dynamic resistance: {display(health.resistanceOhms, 5)} Ω ·
                Qualified bursts: {health.burstCount} · Maximum cell delta:{" "}
                {display(health.maxCellDelta, 3)} V
              </p>
              {health.reasons.length > 0 && (
                <ul>
                  {health.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              )}
              <small>
                Model {health.version}: capacity 40%, sag 35%, cycles 25%. An
                estimate supports review; it does not authorize flight or
                retirement.
              </small>
            </div>
          </section>
          <AirspaceReview key={draft.id} record={draft} onUpdate={setDraft} />
          <section className="panel form-grid no-print">
            <h2>Flight evidence review</h2>
            <div className="form-row">
              <label>
                Actual drone UIN
                <input
                  maxLength={100}
                  value={draft.review.droneUin}
                  onChange={(e) => review("droneUin", e.target.value)}
                />
              </label>
              <label>
                Pilot name
                <input
                  maxLength={120}
                  value={draft.review.pilotName}
                  onChange={(e) => review("pilotName", e.target.value)}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                RPC number
                <input
                  maxLength={100}
                  value={draft.review.pilotRpc}
                  onChange={(e) => review("pilotRpc", e.target.value)}
                />
              </label>
              <label>
                RPC issued on
                <input
                  type="date"
                  value={draft.review.rpcIssuedOn}
                  onChange={(e) => review("rpcIssuedOn", e.target.value)}
                />
              </label>
              <label>
                RPC expires on
                <input
                  type="date"
                  value={draft.review.rpcExpiresOn}
                  onChange={(e) => review("rpcExpiresOn", e.target.value)}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Takeoff time (UTC)
                <input
                  type="datetime-local"
                  step="1"
                  value={draft.review.takeoffUtc.slice(0, 19)}
                  onChange={(e) =>
                    review(
                      "takeoffUtc",
                      e.target.value ? e.target.value + "Z" : "",
                    )
                  }
                />
              </label>
              <label>
                Landing time (UTC)
                <input
                  type="datetime-local"
                  step="1"
                  value={draft.review.landingUtc.slice(0, 19)}
                  onChange={(e) =>
                    review(
                      "landingUtc",
                      e.target.value ? e.target.value + "Z" : "",
                    )
                  }
                />
              </label>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={draft.review.timesConfirmed}
                onChange={(e) => review("timesConfirmed", e.target.checked)}
              />
              I confirmed actual takeoff/landing timestamps and location
              samples.
            </label>
            <div className="form-row">
              <label>
                Mission purpose
                <select
                  value={draft.review.purpose}
                  onChange={(e) => review("purpose", e.target.value)}
                >
                  <option value="">Select mission purpose</option>
                  {purposes.map((purpose) => (
                    <option key={purpose}>{purpose}</option>
                  ))}
                </select>
              </label>
              <label>
                Incident / accident declaration
                <input
                  placeholder="Enter Nil or describe the occurrence"
                  maxLength={2000}
                  value={draft.review.incidents}
                  onChange={(e) => review("incidents", e.target.value)}
                />
              </label>
            </div>
            <div className="form-row">
              <label>
                Verified maximum AGL (m)
                <input
                  type="number"
                  min="0"
                  step=".01"
                  value={draft.review.verifiedAglMeters ?? ""}
                  onChange={(e) =>
                    review(
                      "verifiedAglMeters",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                />
              </label>
              <label>
                Applicable height ceiling
                <select
                  value={draft.review.applicableCeiling ?? ""}
                  onChange={(e) =>
                    review(
                      "applicableCeiling",
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                >
                  <option value="">Needs review</option>
                  <option value="120">120 m — general green zone</option>
                  <option value="60">60 m — applicable airport vicinity</option>
                </select>
              </label>
            </div>
            <label>
              AGL measurement evidence / reference
              <input
                maxLength={500}
                value={draft.review.altitudeEvidence}
                onChange={(e) => review("altitudeEvidence", e.target.value)}
              />
            </label>
            <div className="form-row">
              <label>
                Most restrictive route zone
                <select
                  value={draft.review.airspaceZone}
                  onChange={(e) =>
                    review(
                      "airspaceZone",
                      e.target.value as Review["airspaceZone"],
                    )
                  }
                >
                  {["unknown", "green", "yellow", "red"].map((zone) => (
                    <option key={zone}>{zone}</option>
                  ))}
                </select>
              </label>
              <label>
                Permission authority & reference
                <input
                  maxLength={500}
                  value={draft.review.permissionReference}
                  onChange={(e) =>
                    review("permissionReference", e.target.value)
                  }
                />
              </label>
            </div>
            <RegulatoryEvidence
              value={draft.review}
              onChange={(value) => setDraft({ ...draft, review: value })}
            />
            <label>
              Complete-route airspace review evidence
              <input
                maxLength={1000}
                value={draft.review.airspaceEvidence}
                onChange={(e) => review("airspaceEvidence", e.target.value)}
                placeholder="Map version/date, route check and applicable restrictions"
              />
            </label>
            <div className="form-row">
              <label>
                Reviewer name
                <input
                  maxLength={120}
                  value={draft.review.reviewer}
                  onChange={(e) => review("reviewer", e.target.value)}
                />
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={draft.review.reviewed}
                  onChange={(e) => review("reviewed", e.target.checked)}
                />
                I reviewed this record and its evidence.
              </label>
            </div>
            <button
              disabled={busy || !canEdit}
              className="primary"
              onClick={save}
            >
              Save flight review
            </button>
          </section>
          <div className="actions no-print">
            <button
              disabled={reportBlocked}
              className="primary"
              onClick={() => {
                if (!reportBlocked) window.print();
              }}
            >
              Print flight report / Save PDF
            </button>
            <a
              className="secondary"
              href={reportBlocked ? undefined : exportCsv()}
              download="logskies-flight-record-draft.csv"
            >
              Export flight CSV
            </a>
            <a
              className="secondary"
              href={
                "data:application/json;charset=utf-8," +
                encodeURIComponent(
                  JSON.stringify({ ...draft, health, checks }, null, 2),
                )
              }
              download="logskies-flight-evidence.json"
            >
              Download evidence JSON
            </a>
            <button
              className="secondary"
              onClick={async () => {
                try {
                  const source = await store.readSource(draft.sourceHash);
                  download(new Blob([source.buffer]), draft.filename);
                  setMessage(
                    "Original log retrieved. The browser download has been requested.",
                  );
                } catch (error) {
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : "Source download failed.",
                  );
                }
              }}
            >
              Download original log
            </button>
          </div>
          <section className="panel form-grid no-print">
            <h3>Supporting evidence files</h3>
            <p className="muted">
              Attach permission documents, airspace checks or notification
              receipts. Files stay private to this organization (or this browser
              in the demo). Keep originals; a fingerprint does not verify
              document authenticity.
            </p>
            {canEdit && !reportOnly && (
              <div className="form-row">
                <label>
                  Evidence category
                  <select
                    value={attachmentKind}
                    onChange={(e) =>
                      setAttachmentKind(
                        e.target.value as EvidenceAttachment["kind"],
                      )
                    }
                  >
                    <option value="permission">Permission</option>
                    <option value="airspace">Airspace check</option>
                    <option value="occurrence">
                      Occurrence / notification
                    </option>
                  </select>
                </label>
                <label>
                  Attach PDF, PNG or JPEG (5 MB maximum)
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    disabled={busy}
                    onChange={(e) => {
                      void attachEvidence(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            )}
            {(draft.review.attachments ?? []).map((file) => (
              <div key={file.hash} className="actions">
                <span>
                  {file.kind}: {file.filename}
                </span>
                <button
                  className="secondary"
                  onClick={async () => {
                    try {
                      const source = await store.readSource(file.hash);
                      download(new Blob([source.buffer]), file.filename);
                      setMessage("Evidence download requested.");
                    } catch (error) {
                      setMessage(
                        error instanceof Error
                          ? error.message
                          : "Evidence retrieval failed.",
                      );
                    }
                  }}
                >
                  Download evidence file
                </button>
              </div>
            ))}
          </section>
          {reportBlocked ? (
            <p role="alert">
              Report blocked: re-import the original log with the updated clock
              validation. Older MAVLink imports require rechecking.
            </p>
          ) : (
            <article className="report flight-report">
              <div className="report-header">
                <div className="report-company">
                  {logo && (
                    <Image
                      src={logo}
                      alt="Company logo"
                      width={120}
                      height={70}
                      unoptimized
                      className="company-logo"
                    />
                  )}
                  <div>
                    <h2>{company}</h2>
                    <p>Flight Operations Report</p>
                  </div>
                </div>
                <div className="report-meta">
                  DRAFT / EVIDENCE REVIEW
                  <br />
                  Report: {draft.id.slice(0, 8)}
                  <br />
                  Parser: {draft.parserVersion}
                </div>
              </div>
              <div className="report-warning">
                Official eGCA format acceptance remains unverified. This record
                does not establish regulatory compliance.
              </div>
              <FlightReplay
                key={`report-${draft.id}-${draft.healthInputs.instance}`}
                flight={draft.flight}
                instance={draft.healthInputs.instance}
                printable
              />
              <h3>Mission record</h3>
              <table>
                <tbody>
                  {[
                    ["Aircraft UIN", draft.review.droneUin || "Missing"],
                    [
                      "Pilot / RPC",
                      draft.review.pilotName + " / " + draft.review.pilotRpc,
                    ],
                    ["Takeoff UTC", draft.review.takeoffUtc || "Unknown"],
                    ["Landing UTC", draft.review.landingUtc || "Unknown"],
                    [
                      "Takeoff IST",
                      draft.review.takeoffUtc &&
                      Number.isFinite(Date.parse(draft.review.takeoffUtc))
                        ? new Date(draft.review.takeoffUtc).toLocaleString(
                            "en-GB",
                            { timeZone: "Asia/Kolkata" },
                          )
                        : "Unknown",
                    ],
                    [
                      "Landing IST",
                      draft.review.landingUtc &&
                      Number.isFinite(Date.parse(draft.review.landingUtc))
                        ? new Date(draft.review.landingUtc).toLocaleString(
                            "en-GB",
                            { timeZone: "Asia/Kolkata" },
                          )
                        : "Unknown",
                    ],
                    [
                      "Telemetry interval duration",
                      draft.flight.durationMinutes.toFixed(2) +
                        " min (" +
                        draft.flight.boundary +
                        ")",
                    ],
                    [
                      "First / last route position",
                      draft.flight.route.length
                        ? draft.flight.route[0].lat.toFixed(4) +
                          ", " +
                          draft.flight.route[0].lon.toFixed(4) +
                          " / " +
                          draft.flight.route.at(-1)!.lat.toFixed(4) +
                          ", " +
                          draft.flight.route.at(-1)!.lon.toFixed(4)
                        : "Unavailable",
                    ],
                    [
                      "Maximum AGL / relative altitude",
                      display(draft.review.verifiedAglMeters) +
                        " / " +
                        display(draft.flight.maxRelativeAltitude) +
                        " m",
                    ],
                    [
                      "Purpose / incidents",
                      draft.review.purpose + " / " + draft.review.incidents,
                    ],
                    [
                      "Airspace / permission",
                      draft.review.airspaceZone +
                        " / " +
                        (draft.review.permissionReference || "Not supplied"),
                    ],
                    [
                      "Battery / estimated health",
                      (battery?.tag || "Unmatched") +
                        " / " +
                        (draft.batteryId && health.health !== null
                          ? display(health.health) + "%"
                          : "Unassessed"),
                    ],
                    [
                      "Consumed mAh / max current",
                      display(health.consumedMah) +
                        " / " +
                        display(health.maxCurrent) +
                        " A",
                    ],
                    ...regulatoryEvidenceRows(draft.review),
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td>{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3>Evidence checklist</h3>
              <table>
                <tbody>
                  {checks.map((check) => (
                    <tr key={check.name}>
                      <th scope="row">{check.name}</th>
                      <td>
                        <strong className={`check-state ${check.state}`}>
                          {check.state.toUpperCase()}
                        </strong>
                        <br />
                        {check.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h3>Source provenance</h3>
              <p className="source-hash">
                {draft.filename} · {draft.sourceBytes.toLocaleString()} bytes
                <br />
                SHA-256: {draft.sourceHash}
              </p>
              <p>
                Imported: {draft.importedAt}
                <br />
                Reviewer: {draft.review.reviewer || "Pending"} ·{" "}
                {draft.review.reviewed ? "Operator declared review" : "Pending"}
              </p>
              <p>
                AGL evidence: {draft.review.altitudeEvidence || "Pending"}
                <br />
                Airspace evidence: {draft.review.airspaceEvidence || "Pending"}
              </p>
              <footer>
                Prepared with LogSkies. Operator entries and automated telemetry
                are identified separately. Health model: {health.version}.
                Preserve the original source log and review all evidence gaps.
              </footer>
              <h3>Operator sign-off</h3>
              <p>
                Review this record against the original log and applicable
                operational permissions. Telemetry estimates do not certify
                battery airworthiness.
              </p>
              <p>
                Remote pilot signature: ____________________ Date: __________
              </p>
              <p>
                Fleet manager signature: ____________________ Organization seal:
                __________
              </p>
            </article>
          )}
        </>
      )}
    </div>
  );
}
