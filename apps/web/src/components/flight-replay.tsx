"use client";
import { useEffect, useMemo, useState } from "react";
import type { ParsedFlight } from "@logskies/telemetry";
import {
  segments,
  observedAt,
  projectRoute,
  OBSERVATION_GAP_SECONDS,
} from "@logskies/telemetry/replay";

const value = (n: number | null | undefined, unit: string) =>
  n !== null && n !== undefined && Number.isFinite(n)
    ? `${n.toFixed(2)} ${unit}`
    : "Unknown";
const elapsed = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
export default function FlightReplay({
  flight,
  instance,
  printable = false,
}: {
  flight: ParsedFlight;
  instance: number;
  printable?: boolean;
}) {
  const [time, setTime] = useState(flight.start);
  const [playing, setPlaying] = useState(false);
  const duration = flight.end - flight.start;
  const route = useMemo(
    () =>
      projectRoute(
        flight.route.filter(
          (p) =>
            Number.isFinite(p.lat) &&
            Number.isFinite(p.lon) &&
            Math.abs(p.lat) <= 90 &&
            Math.abs(p.lon) <= 180,
        ),
      ),
    [flight.route],
  );
  const routeSegments = useMemo(
    () => segments(route ?? [], () => true),
    [route],
  );
  const batteries = useMemo(
    () => flight.batteries.filter((p) => p.instance === instance),
    [flight.batteries, instance],
  );
  const voltageSegments = useMemo(
    () =>
      segments(
        batteries,
        (p) => p.voltage !== null && Number.isFinite(p.voltage),
      ),
    [batteries],
  );
  const selected = route ? observedAt(route, time) : null;
  const battery = observedAt(batteries, time);
  const voltages = batteries.flatMap((p) =>
    p.voltage !== null && Number.isFinite(p.voltage) ? [p.voltage] : [],
  );
  const minV = voltages.length
      ? voltages.reduce((a, b) => Math.min(a, b), Infinity)
      : 0,
    maxV = voltages.length
      ? voltages.reduce((a, b) => Math.max(a, b), -Infinity)
      : 0;
  const x = (t: number) =>
    40 +
    Math.max(0, Math.min(1, (t - flight.start) / Math.max(1, duration))) * 640;
  const y = (v: number) => 110 - ((v - minV) / Math.max(0.1, maxV - minV)) * 75;
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      const next = Math.min(flight.end, time + Math.max(0.2, duration / 150));
      setTime(next);
      if (next >= flight.end) setPlaying(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [playing, time, duration, flight.end]);
  if (!Number.isFinite(duration) || duration <= 0)
    return <p>Replay unavailable: interval timing needs review.</p>;
  return (
    <section
      className={`flight-replay ${printable ? "replay-print" : ""}`}
      aria-label="Flight path and synchronized battery telemetry"
    >
      <div className="replay-title">
        <div>
          <p className="section-kicker">RECORDED FLIGHT EVIDENCE</p>
          <h3>Flight path & telemetry</h3>
        </div>
        <span>
          {flight.complete
            ? "Armed interval · review required"
            : "Incomplete interval"}
        </span>
      </div>
      <div className="replay-layout">
        <div className="replay-map">
          <div className="replay-map-label">
            <strong>GPS coordinate map</strong>
            <span>North ↑ · no satellite imagery</span>
          </div>
          {route?.length ? (
            <svg
              viewBox="0 0 720 360"
              role="img"
              aria-label="Recorded GPS positions with disconnected paths across observation gaps"
            >
              <path
                d="M40 60H680M40 120H680M40 180H680M40 240H680M40 300H680M100 40V320M230 40V320M360 40V320M490 40V320M620 40V320"
                stroke="#ffffff12"
                fill="none"
              />
              {routeSegments.map((part, i) => (
                <g key={i}>
                  <polyline
                    points={part.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="#a7d875"
                    strokeWidth="3"
                  />
                  {part.length === 1 && (
                    <circle
                      cx={part[0].x}
                      cy={part[0].y}
                      r="3"
                      fill="#a7d875"
                    />
                  )}
                </g>
              ))}
              <circle
                cx={route[0].x}
                cy={route[0].y}
                r="7"
                fill="#a7d875"
                stroke="#202d28"
                strokeWidth="2"
              />
              <circle
                cx={route.at(-1)!.x}
                cy={route.at(-1)!.y}
                r="7"
                fill="#fff"
                stroke="#202d28"
                strokeWidth="2"
              />
              {!printable && selected && (
                <g>
                  <circle
                    cx={selected.x}
                    cy={selected.y}
                    r="13"
                    fill="#ffffff22"
                  />
                  <circle
                    cx={selected.x}
                    cy={selected.y}
                    r="5"
                    fill="#f1bf54"
                  />
                </g>
              )}
            </svg>
          ) : (
            <div className="replay-empty">
              No recorded GPS positions. A flight path cannot be reconstructed.
            </div>
          )}
          <div className="replay-legend">
            <span>● First observed</span>
            <span>○ Last observed</span>
            {!printable && <span>● Selected observation</span>}
          </div>
          <small>
            Local coordinate projection preserves route shape; first/last
            observations are not confirmed takeoff/landing.
            {" "}GPS gaps: {Math.max(0, routeSegments.length - 1)}. Lines break
            across gaps over {OBSERVATION_GAP_SECONDS} seconds.
          </small>
        </div>
        <div className="replay-readings">
          <h4>{printable ? "Interval evidence" : "At the selected time"}</h4>
          {!printable && (
            <dl>
              <div>
                <dt>GPS position</dt>
                <dd>
                  {selected
                    ? `${selected.lat.toFixed(6)}, ${selected.lon.toFixed(6)}`
                    : "Unknown · GPS gap"}
                </dd>
              </div>
              <div>
                <dt>Observation age</dt>
                <dd>{selected ? value(time - selected.t, "s") : "Unknown"}</dd>
              </div>
              <div>
                <dt>Relative altitude</dt>
                <dd>{value(selected?.relative, "m")}</dd>
              </div>
              <div>
                <dt>Recorded altitude (not AGL)</dt>
                <dd>{value(selected?.alt, "m")}</dd>
              </div>
              <div>
                <dt>Pack voltage</dt>
                <dd>{value(battery?.voltage, "V")}</dd>
              </div>
              <div>
                <dt>Current</dt>
                <dd>{value(battery?.current, "A")}</dd>
              </div>
              <div>
                <dt>Capacity counter</dt>
                <dd>{value(battery?.consumed, "mAh")}</dd>
              </div>
            </dl>
          )}
          <p>
            {flight.route.length} position observations · battery channel{" "}
            {instance}
          </p>
          <p>
            Line breaks mark gaps over {OBSERVATION_GAP_SECONDS} seconds or
            missing readings. This display rule does not diagnose a fault.
          </p>
          {routeSegments.length > 1 && (
            <p className="replay-warning">
              GPS observation gaps: {routeSegments.length - 1}. Positions are
              not interpolated across gaps.
            </p>
          )}
        </div>
      </div>
      {!printable && (
        <div className="replay-controls">
          <button
            type="button"
            className="secondary"
            disabled={!route?.length}
            onClick={() => {
              if (time >= flight.end) setTime(flight.start);
              setPlaying(!playing);
            }}
          >
            {playing ? "Pause" : "Replay"}
          </button>
          <label>
            Interval timeline{" "}
            <input
              aria-label="Flight replay timeline"
              type="range"
              min={flight.start}
              max={flight.end}
              step="0.1"
              value={time}
              onChange={(e) => {
                setPlaying(false);
                setTime(Number(e.target.value));
              }}
            />
          </label>
          <output aria-live="off">
            {elapsed(time - flight.start)} / {elapsed(duration)}
          </output>
        </div>
      )}
      <div className="replay-voltage">
        <h4>Recorded pack voltage</h4>
        {voltages.length ? (
          <svg
            viewBox="0 0 720 150"
            role="img"
            aria-label="Pack voltage chart linked to replay time; missing data breaks the line"
          >
            <path d="M40 20V115H680" stroke="#d9e2d3" fill="none" />
            {voltageSegments.map((part, i) => (
              <g key={i}>
                <polyline
                  points={part
                    .map((p) => `${x(p.t)},${y(p.voltage!)}`)
                    .join(" ")}
                  stroke="#527c27"
                  strokeWidth="2"
                  fill="none"
                />
                {part.length === 1 && (
                  <circle
                    cx={x(part[0].t)}
                    cy={y(part[0].voltage!)}
                    r="2"
                    fill="#527c27"
                  />
                )}
              </g>
            ))}
            {!printable && (
              <line
                x1={x(time)}
                x2={x(time)}
                y1="20"
                y2="115"
                stroke="#b47d21"
                strokeDasharray="4 4"
              />
            )}
            <text x="40" y="16">
              {maxV.toFixed(2)} V
            </text>
            <text x="40" y="140">
              {minV.toFixed(2)} V · elapsed interval time
            </text>
          </svg>
        ) : (
          <p>No usable voltage readings for this channel.</p>
        )}
      </div>
      {!printable && (
        <details className="replay-evidence">
          <summary>Evidence warnings ({flight.warnings.length})</summary>
          <ul>
            {flight.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
