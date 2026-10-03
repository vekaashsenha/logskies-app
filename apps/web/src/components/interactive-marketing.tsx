"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { IndustryArt, industries } from "./marketing";
import { hasPaymentLinks, paymentLink } from "@/lib/payment-links";

const telemetry = [
  ["Pack health", "94%", "Cell delta", "0.02 V", "Cycles", "82"],
  ["Survey time", "28 min", "Altitude", "98 m AGL", "Area", "42 ha"],
  ["Site passes", "06", "Flight time", "24 min", "Pack used", "BATT-03"],
  ["Training flight", "12 min", "Student", "PILOT-08", "Review", "Pending"],
  ["Inspection time", "22 min", "Asset", "LINE-04", "Pack health", "91%"],
  ["Route length", "8.2 km", "Payload", "2 kg", "Permission", "Review"],
];
export function IndustryExplorer() {
  const [active, setActive] = useState(0);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const item = industries[active];
  return (
    <section className="public-section public-container">
      <div className="section-heading">
        <p className="section-kicker">YOUR INDUSTRY. YOUR WORKFLOW.</p>
        <h2>Built around the way you fly.</h2>
        <p>Explore the operational context behind each mission.</p>
      </div>
      <div
        className="industry-tabs"
        role="tablist"
        aria-label="Industry solutions"
      >
        {industries.map((industry, i) => (
          <button
            ref={(node) => {
              refs.current[i] = node;
            }}
            key={industry.kind}
            id={`industry-tab-${i}`}
            role="tab"
            aria-selected={active === i}
            tabIndex={active === i ? 0 : -1}
            aria-controls="industry-panel"
            onClick={() => setActive(i)}
            onKeyDown={(event) => {
              let next = active;
              if (event.key === "ArrowRight")
                next = (active + 1) % industries.length;
              else if (event.key === "ArrowLeft")
                next = (active + industries.length - 1) % industries.length;
              else if (event.key === "Home") next = 0;
              else if (event.key === "End") next = industries.length - 1;
              else return;
              event.preventDefault();
              setActive(next);
              refs.current[next]?.focus();
            }}
          >
            {industry.title}
          </button>
        ))}
      </div>
      <div
        className="industry-panel"
        id="industry-panel"
        role="tabpanel"
        aria-labelledby={`industry-tab-${active}`}
      >
        <div className="explorer-photo">
          <IndustryArt kind={active} />
          <span className="photo-caption">Illustrative industry image</span>
        </div>
        <div className="explorer-copy">
          <p className="section-kicker">LOGSKIES FOR YOUR TEAM</p>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <ul className="check-list">
            {item.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <div className="mini-telemetry">
            <small>ILLUSTRATIVE TELEMETRY · SAMPLE DATA</small>
            <div>
              {[0, 2, 4].map((i) => (
                <p key={i}>
                  <span>{telemetry[active][i]}</span>
                  <strong>{telemetry[active][i + 1]}</strong>
                </p>
              ))}
            </div>
          </div>
          <Link href="/dashboard">Explore interactive workspace →</Link>
        </div>
      </div>
    </section>
  );
}

const sampleCsv =
  "record_status,flight_id,duration_minutes,max_relative_altitude_m,end_voltage,airspace_review,pilot_review\nDEMO_DRAFT,FLIGHT-042,28,98,21.6,PENDING,PENDING\n";
export function WorkflowDemo() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<"idle" | "parsing" | "ready">("idle");
  return (
    <section className="public-section section-soft">
      <div className="public-container">
        <div className="section-heading">
          <p className="section-kicker">FROM PACK TO PAPERWORK</p>
          <h2>Three steps. One connected record.</h2>
          <p>
            Try the sample workflow below. No real flight log is uploaded or
            processed.
          </p>
        </div>
        <div className="feature-grid workflow-demo">
          <article className="public-card">
            <span className="feature-number">01</span>
            <h3>Tag the battery</h3>
            <p>
              Attach a waterproof QR label to each pack. Scan its identity
              before the mission.
            </p>
            <button
              className="secondary"
              onClick={() => dialog.current?.showModal()}
            >
              Simulate QR scan
            </button>
          </article>
          <article className="public-card">
            <span className="feature-number">02</span>
            <h3>Ingest telemetry</h3>
            <p>
              Try this simulated preview, or import a real supported .bin or
              .tlog in the dashboard.
            </p>
            <button
              className="demo-dropzone"
              disabled={state === "parsing"}
              onClick={async () => {
                setState("parsing");
                await new Promise((resolve) => setTimeout(resolve, 2000));
                setState("ready");
              }}
            >
              {state === "parsing"
                ? "Parsing sample…"
                : "↑ Simulate .bin upload"}
              <small>ardupilot_flight_042.bin</small>
            </button>
            <div role="status" className="demo-result">
              {state === "ready" &&
                "Simulated result: 28 min · 98 m relative altitude · 21.6 V end voltage. Actual flight and evidence review pending."}
            </div>
          </article>
          <article className="public-card">
            <span className="feature-number">03</span>
            <h3>Export your flight record</h3>
            <p>
              Download a sample manifest, then preview company-branded reports
              in the workspace.
            </p>
            <a
              className={
                state === "ready" ? "primary" : "secondary disabled-link"
              }
              aria-disabled={state !== "ready"}
              href={
                state === "ready"
                  ? `data:text/csv;charset=utf-8,${encodeURIComponent(sampleCsv)}`
                  : undefined
              }
              download="logskies-demo-draft.csv"
            >
              Download demo manifest
            </a>
            <p className="fine-print">
              Demo draft; official eGCA format verification pending.
            </p>
          </article>
        </div>
        <dialog
          ref={dialog}
          className="scan-dialog"
          aria-labelledby="scan-title"
        >
          <div className="scan-dialog-head">
            <p className="section-kicker">SIMULATED QR SCAN</p>
            <button
              className="secondary"
              aria-label="Close QR preview"
              onClick={() => dialog.current?.close()}
            >
              ×
            </button>
          </div>
          <h2 id="scan-title">BATT-AG-001 identified</h2>
          <p>LiPo 6S · 16,000 mAh · sample cell measurements</p>
          <div className="cell-grid">
            {[4.08, 4.09, 4.07, 4.08, 4.09, 4.08].map((value, i) => (
              <div key={i}>
                <small>Cell {i + 1}</small>
                <strong>{value.toFixed(2)} V</strong>
              </div>
            ))}
          </div>
          <p className="notice">
            Cell delta: 0.02 V. Standard QR tags identify a pack; cell voltages
            require compatible telemetry.
          </p>
          <button className="primary" onClick={() => dialog.current?.close()}>
            Done
          </button>
        </dialog>
      </div>
    </section>
  );
}

const rows = [
  [
    "Route airspace evidence review",
    "Local map review",
    "Local map review",
    "Local map review",
  ],
  [
    "Telemetry ingestion (.bin / .tlog)",
    "Local import",
    "Local import",
    "Local import",
  ],
  [
    "QR identification / health estimates",
    "QR / qualified estimates",
    "QR / qualified estimates",
    "QR / qualified estimates",
  ],
  ["Maintenance schedules", "—", "Planned", "Planned"],
  [
    "Incident declarations in flight records",
    "Local records",
    "Local records",
    "Local records",
  ],
  [
    "Branded record / eGCA export",
    "Draft / planned",
    "Draft / planned",
    "Draft / planned",
  ],
  [
    "Multi-pilot management",
    "Org membership",
    "Org membership",
    "Custom workflow planned",
  ],
];
export function PricingMatrix() {
  const [annual, setAnnual] = useState(false);
  return (
    <section className="public-section public-container">
      <div className="billing-toggle" role="group" aria-label="Billing period">
        <button aria-pressed={!annual} onClick={() => setAnnual(false)}>
          Monthly
        </button>
        <button aria-pressed={annual} onClick={() => setAnnual(true)}>
          Annual <span>Save 20%</span>
        </button>
      </div>
      <p className="pricing-note">
        {hasPaymentLinks()
          ? "Checkout opens with the payment provider. Confirm the plan, billing period and final amount before paying. Account activation requires payment verification; UPI AutoPay is not enabled."
          : "Proposed launch pricing. Trial enrollment, checkout and UPI AutoPay are not active yet. Taxes and final limits to be confirmed."}
      </p>
      <div className="pricing-grid">
        {[
          {
            name: "Starter Fleet",
            price: 999,
            description: "A consistent foundation for small fleets.",
            items: [
              "Up to 5 drones",
              "Up to 25 batteries",
              "QR battery identification",
              "Draft flight CSV export",
            ],
          },
          {
            name: "Pro Fleet",
            price: 1999,
            description: "Deeper visibility for growing field teams.",
            items: [
              "Starter fleet workflows",
              "Qualified battery health estimates",
              "Local telemetry analysis",
              "Planned priority WhatsApp support",
            ],
          },
          {
            name: "Enterprise / RPTO",
            price: 0,
            description: "An operational workflow built around your team.",
            items: [
              "Planned multi-organization control",
              "Planned instructor approvals",
              "Planned API webhooks",
              "Requirements and rollout planning",
            ],
          },
        ].map((plan, i) => {
          const checkout =
            i < 2
              ? paymentLink(
                  i === 0 ? "starter" : "pro",
                  annual ? "annual" : "monthly",
                )
              : null;
          return (
            <article
              key={plan.name}
              className={`public-card price-card ${i === 1 ? "featured-plan" : ""}`}
            >
              {i === 1 && (
                <div className="popular-bar">Most Popular · Proposed plan</div>
              )}
              <h3>{plan.name}</h3>
              <h2>
                {plan.price
                  ? `₹${(plan.price * (annual ? 0.8 : 1)).toLocaleString("en-IN", { minimumFractionDigits: annual ? 2 : 0, maximumFractionDigits: 2 })}`
                  : "Custom"}
                {plan.price > 0 && <small>/ month</small>}
              </h2>
              <p className="billing-detail">
                {plan.price
                  ? annual
                    ? `₹${(plan.price * 0.8 * 12).toLocaleString("en-IN", { minimumFractionDigits: annual ? 2 : 0, maximumFractionDigits: 2 })} billed annually`
                    : "Billed monthly"
                  : "Let’s discuss your fleet"}
              </p>
              <p>{plan.description}</p>
              <ul className="check-list">
                {plan.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              {checkout ? (
                <a
                  href={checkout}
                  className={i === 1 ? "primary" : "secondary"}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Continue to payment →
                </a>
              ) : (
                <Link
                  href="/contact"
                  className={i === 1 ? "primary" : "secondary"}
                >
                  {i === 2 ? "Contact our team" : "Request launch access"} →
                </Link>
              )}
            </article>
          );
        })}
      </div>
      <div className="section-heading matrix-heading">
        <h2>Compare your fleet options.</h2>
        <p>Current prototype capabilities and planned launch features.</p>
      </div>
      <div className="matrix-scroll">
        <table className="comparison-table">
          <caption className="sr-only">
            Proposed plan feature comparison
          </caption>
          <thead>
            <tr>
              {[
                "Feature",
                "Starter Fleet",
                "Pro Fleet",
                "Enterprise / RPTO",
              ].map((name) => (
                <th key={name} scope="col">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row[0]}>
                <th scope="row">{row[0]}</th>
                {row.slice(1).map((cell, i) => (
                  <td key={i}>
                    {cell.includes("QR") ||
                    cell.includes("Draft") ||
                    cell.includes("membership") ? (
                      <span className="matrix-check">✓ </span>
                    ) : null}
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
