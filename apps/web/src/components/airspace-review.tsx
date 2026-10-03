"use client";
import { useState } from "react";
import { parseZones, type AirspaceResult } from "@logskies/telemetry/airspace";
import type { FlightRecord } from "@/lib/flight-storage";
export default function AirspaceReview({
  record,
  onUpdate,
}: {
  record: FlightRecord;
  onUpdate: (record: FlightRecord) => void;
}) {
  const [source, setSource] = useState(""),
    [date, setDate] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function upload(file?: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMessage("Choose a regional GeoJSON extract under 2 MB.");
      return;
    }
    setBusy(true);
    try {
      const bytes = await file.arrayBuffer(),
        dataset = parseZones(
          JSON.parse(new TextDecoder().decode(bytes)),
          source,
          date,
        );
      const sourceHash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      )
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      const result = await new Promise<AirspaceResult>((resolve, reject) => {
        const worker = new Worker(
          new URL("./flight-parser.worker.ts", import.meta.url),
        );
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(
            new Error(
              "Route check exceeded 60 seconds. Use a smaller regional map.",
            ),
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
          reject(new Error("Airspace worker failed."));
        };
        worker.postMessage({
          kind: "airspace",
          route: record.flight.route,
          dataset,
        });
      });
      onUpdate({
        ...record,
        airspace: { dataset, result, sourceHash },
        review: {
          ...record.review,
          airspaceZone: result.mostRestrictive,
          airspaceEvidence:
            dataset.source +
            " · published " +
            dataset.publishedOn +
            " · GeoJSON SHA-256 " +
            sourceHash,
        },
      });
      setMessage(
        "Route geometry check complete. Review source authenticity and current restrictions, then save the flight review.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Airspace check failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel form-grid no-print">
      <h2>Route airspace geometry check</h2>
      <p className="muted">
        Import an operator-verified regional map extract. This tool does not
        retrieve or certify official DigitalSky data. Each polygon needs
        properties.zone set to green, yellow or red; coordinates must be WGS84
        longitude / latitude.
      </p>
      <div className="form-row">
        <label>
          Map source / official reference
          <input
            maxLength={500}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </label>
        <label>
          Map publication date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <label>
        Regional airspace GeoJSON
        <input
          type="file"
          disabled={busy}
          accept=".geojson,.json"
          onChange={(e) => {
            upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {record.airspace && (
        <div className="notice">
          <strong>
            Most restrictive intersected zone:{" "}
            {record.airspace.result.mostRestrictive.toUpperCase()} · coverage{" "}
            {record.airspace.result.coverageComplete
              ? "complete for observed route"
              : "incomplete"}
          </strong>
          <ul>
            {record.airspace.result.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <p>
            Intersected:{" "}
            {record.airspace.result.intersectedFeatures.join(", ") || "None"}
          </p>
        </div>
      )}
    </section>
  );
}
