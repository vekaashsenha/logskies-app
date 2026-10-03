"use client";
import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import FlightWorkbench from "@/components/flight-workbench";
import {
  batteryStatus,
  sampleBatteries,
  sampleDrones,
  csvCell,
  type Battery,
  type Session,
} from "@logskies/domain";

type Store = {
  company: string;
  logo: string;
  batteries: Battery[];
  sessions: Session[];
};
const initial: Store = {
  company: "Your organization",
  logo: "",
  batteries: sampleBatteries,
  sessions: [],
};
const storageKey = "logskies-demo-v1";
const subscribe = (callback: () => void) => {
  window.addEventListener("logskies-change", callback);
  return () => window.removeEventListener("logskies-change", callback);
};
const snapshot = () => window.localStorage.getItem(storageKey);
const serverSnapshot = () => null;
function loadStore(raw: string | null): Store {
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed &&
      typeof parsed.company === "string" &&
      typeof parsed.logo === "string" &&
      Array.isArray(parsed.batteries) &&
      Array.isArray(parsed.sessions)
      ? parsed
      : initial;
  } catch {
    return initial;
  }
}
const tabs = [
  "Overview",
  "Batteries",
  "Preflight",
  "Flight logs",
  "Reports",
  "Company settings",
] as const;
type Tab = (typeof tabs)[number];
export default function Home() {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const store = loadStore(raw);
  const [tab, setTab] = useState<Tab>("Overview");
  const [message, setMessage] = useState("");
  const [batteryId, setBatteryId] = useState(sampleBatteries[0].id);
  const [company, setCompany] = useState("");
  const [tag, setTag] = useState("");
  const [capacity, setCapacity] = useState("16000");
  function save(next: Store) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      window.dispatchEvent(new Event("logskies-change"));
    } catch {
      setMessage(
        "Unable to save locally. Try a smaller logo or enable browser storage.",
      );
      return false;
    }
    return true;
  }
  function addBattery(event: React.FormEvent) {
    event.preventDefault();
    if (
      store.batteries.some(
        (b) => b.tag.toLowerCase() === tag.trim().toLowerCase(),
      )
    ) {
      setMessage("This asset tag already exists.");
      return;
    }
    const value = Number(capacity);
    if (!Number.isInteger(value) || value < 1 || value > 1000000) {
      setMessage("Enter a valid capacity between 1 and 1,000,000 mAh.");
      return;
    }
    if (
      save({
        ...store,
        batteries: [
          ...store.batteries,
          {
            id: crypto.randomUUID(),
            tag: tag.trim(),
            chemistry: "LiPo 6S",
            capacityMah: value,
            cycles: 0,
            health: null,
          },
        ],
      })
    ) {
      setTag("");
      setMessage("Battery added to this browser’s demo fleet.");
    }
  }
  function arm(event: React.FormEvent) {
    event.preventDefault();
    if (!store.batteries.some((b) => b.id === batteryId)) {
      setMessage("Select a registered battery.");
      return;
    }
    if (
      save({
        ...store,
        sessions: [
          {
            id: crypto.randomUUID(),
            batteryId,
            droneId: sampleDrones[0].id,
            scannedAt: new Date().toISOString(),
          },
          ...store.sessions,
        ],
      })
    )
      setMessage("Preflight session recorded locally.");
  }
  async function uploadLogo(file?: File) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 1024 * 1024
    ) {
      setMessage("Choose a PNG, JPG or WebP logo under 1 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (save({ ...store, logo: String(reader.result) }))
        setMessage("Company logo updated.");
    };
    reader.onerror = () => setMessage("Unable to read this logo.");
    reader.readAsDataURL(file);
  }
  function exportSessions() {
    const rows = [
      [
        "Record type",
        "Battery asset tag",
        "Drone identity",
        "Scan timestamp UTC",
        "Status",
      ],
      ...store.sessions.map((s) => [
        "Preflight session",
        store.batteries.find((b) => b.id === s.batteryId)?.tag || "Unknown",
        sampleDrones[0].uin,
        s.scannedAt,
        "Demo / flight not verified",
      ]),
    ];
    const blob = new Blob(
      ["\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "logskies-demo-preflight-records.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="app-shell">
      <aside className="sidebar no-print">
        <div className="brand">
          <span className="brand-mark">L</span> LogSkies
        </div>
        <p className="eyebrow">FLEET WORKSPACE</p>
        <nav>
          {tabs.map((item) => (
            <button
              key={item}
              onClick={() => {
                setTab(item);
                setMessage("");
              }}
              className={tab === item ? "nav-item active" : "nav-item"}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="dot" /> Local demo
          <br />
          <small>Shared backend connection pending</small>
        </div>
      </aside>
      <main>
        <header className="topbar no-print">
          <span>{store.company}</span>
          <Link className="text-button" href="/workspace">
            Open connected workspace →
          </Link>
        </header>
        <div className="content">
          <div className="page-heading no-print">
            <div>
              <p className="eyebrow">LOGSKIES / OPERATIONS</p>
              <h1>{tab === "Overview" ? "Fleet at a glance" : tab}</h1>
              <p className="muted">
                {tab === "Reports"
                  ? "Prepare a branded record pack with visible evidence gaps."
                  : "Every battery. Every mission. A clearer operational record."}
              </p>
            </div>
            <button className="primary" onClick={() => setTab("Preflight")}>
              New preflight session ↗
            </button>
          </div>
          <div className="notice no-print">
            DEMO MODE · Records stay in this browser. Android records are
            separate until the shared backend is connected. Import real flight
            logs in the Flight logs tab.
          </div>
          {message && (
            <p role="status" className="notice no-print">
              {message}
            </p>
          )}
          {tab === "Overview" && (
            <>
              <div className="stats">
                <Metric
                  label="Registered batteries"
                  value={String(store.batteries.length)}
                  note="Physical packs in your inventory"
                />
                <Metric
                  label="Preflight sessions"
                  value={String(store.sessions.length)}
                  note="Battery and drone associations"
                />
                <Metric
                  label="Flight log processing"
                  value="Available"
                  note="Import .bin / .tlog under Flight logs"
                />
                <Metric
                  label="Audit readiness"
                  value="Pending"
                  note="Evidence checks required"
                />
              </div>
              <div className="two-columns">
                <section className="panel">
                  <p className="eyebrow">FIELD WORKFLOW</p>
                  <h2>From battery to flight record</h2>
                  {[
                    "Register and tag the battery",
                    "Scan before flight on Android",
                    "Upload telemetry and review the match",
                    "Review evidence and export the report",
                  ].map((step, i) => (
                    <div className="step" key={step}>
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <p>{step}</p>
                    </div>
                  ))}
                </section>
                <section className="panel">
                  <p className="eyebrow">NEXT ACTION</p>
                  <h2>Your fleet starts here</h2>
                  <p className="muted">
                    Add a physical pack, create a preflight session and
                    personalize the company report header.
                  </p>
                  <button
                    className="secondary"
                    onClick={() => setTab("Batteries")}
                  >
                    Open battery inventory →
                  </button>
                  <hr />
                  <p className="muted">
                    Health remains unassessed until sufficient measurements
                    exist. A missing log never becomes a healthy score.
                  </p>
                </section>
              </div>
            </>
          )}
          {tab === "Batteries" && (
            <>
              <section className="panel">
                <h2>Battery inventory</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Asset tag</th>
                        <th>Chemistry</th>
                        <th>Capacity</th>
                        <th>Cycles</th>
                        <th>Health</th>
                        <th>QR payload</th>
                      </tr>
                    </thead>
                    <tbody>
                      {store.batteries.map((b) => (
                        <tr key={b.id}>
                          <td>{b.tag}</td>
                          <td>{b.chemistry}</td>
                          <td>{b.capacityMah.toLocaleString()} mAh</td>
                          <td>{b.cycles}</td>
                          <td>
                            <span className="badge">
                              {batteryStatus(b.health)}
                            </span>
                          </td>
                          <td>
                            <button
                              className="text-button"
                              onClick={async () => {
                                try {
                                  const svg = await QRCode.toString(
                                    `logskies:battery:${b.id}`,
                                    { type: "svg", margin: 2 },
                                  );
                                  const url = URL.createObjectURL(
                                    new Blob([svg], { type: "image/svg+xml" }),
                                  );
                                  const anchor = document.createElement("a");
                                  anchor.href = url;
                                  anchor.download = "logskies-battery-qr.svg";
                                  anchor.click();
                                  setTimeout(
                                    () => URL.revokeObjectURL(url),
                                    1000,
                                  );
                                } catch {
                                  setMessage(
                                    "Unable to generate the QR label.",
                                  );
                                }
                              }}
                            >
                              Download QR label
                            </button>
                            <button
                              className="text-button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    `logskies:battery:${b.id}`,
                                  );
                                  setMessage(
                                    "QR payload copied. Use Download QR label for a printable asset.",
                                  );
                                } catch {
                                  setMessage(
                                    `QR payload: logskies:battery:${b.id}`,
                                  );
                                }
                              }}
                            >
                              Copy identifier
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <form className="panel form-grid" onSubmit={addBattery}>
                <h2>Add a battery</h2>
                <label>
                  Asset tag
                  <input
                    required
                    maxLength={60}
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="BATT-AG-003"
                  />
                </label>
                <label>
                  Rated capacity (mAh)
                  <input
                    required
                    type="number"
                    min="1"
                    max="1000000"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  />
                </label>
                <p className="muted">
                  Initial chemistry: LiPo 6S. Health starts unassessed.
                </p>
                <button className="primary">Add battery</button>
              </form>
            </>
          )}
          {tab === "Preflight" && (
            <div className="two-columns">
              <form className="panel form-grid" onSubmit={arm}>
                <h2>Associate a battery and drone</h2>
                <p className="muted">
                  The Android app uses QR scanning for this step. This web demo
                  lets you select a pack.
                </p>
                <label>
                  Battery
                  <select
                    value={batteryId}
                    onChange={(e) => setBatteryId(e.target.value)}
                  >
                    {store.batteries.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.tag}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Drone
                  <select>
                    <option>{sampleDrones[0].name}</option>
                  </select>
                </label>
                <p className="muted">
                  A preflight record does not confirm takeoff or add a battery
                  cycle.
                </p>
                <button className="primary">Record preflight session</button>
              </form>
              <section className="panel">
                <h2>Recent sessions</h2>
                {store.sessions.length === 0 ? (
                  <p className="muted">No sessions yet.</p>
                ) : (
                  store.sessions.map((s) => (
                    <div className="session" key={s.id}>
                      <strong>
                        {store.batteries.find((b) => b.id === s.batteryId)?.tag}
                      </strong>
                      <span className="muted">
                        {new Date(s.scannedAt).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                        })}{" "}
                        IST
                      </span>
                      <span className="badge">Awaiting telemetry</span>
                    </div>
                  ))
                )}
              </section>
            </div>
          )}
          {tab === "Flight logs" && (
            <FlightWorkbench
              batteries={store.batteries}
              sessions={store.sessions}
              company={store.company}
              logo={store.logo}
            />
          )}
          {tab === "Reports" && (
            <>
              <div className="actions no-print">
                <button className="secondary" onClick={exportSessions}>
                  Export preflight CSV
                </button>
              </div>
              <FlightWorkbench
                reportOnly
                batteries={store.batteries}
                sessions={store.sessions}
                company={store.company}
                logo={store.logo}
              />
            </>
          )}
          {tab === "Company settings" && (
            <section className="panel form-grid">
              <h2>Brand your reports</h2>
              <label>
                Company name
                <input
                  maxLength={120}
                  placeholder={store.company}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </label>
              <button
                className="primary"
                onClick={() => {
                  if (
                    company.trim() &&
                    save({ ...store, company: company.trim() })
                  )
                    setMessage("Company name saved.");
                }}
              >
                Save company name
              </button>
              <label>
                Company logo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => uploadLogo(e.target.files?.[0])}
                />
              </label>
              <p className="muted">
                PNG, JPG or WebP · Maximum 1 MB · Appears in the PDF report
                header.
              </p>
              {store.logo && (
                <div>
                  <Image
                    src={store.logo}
                    alt="Company logo preview"
                    className="company-logo"
                    width={120}
                    height={70}
                    unoptimized
                  />
                  <button
                    className="text-button"
                    onClick={() => save({ ...store, logo: "" })}
                  >
                    Remove logo
                  </button>
                </div>
              )}
              <button className="secondary" onClick={() => setTab("Reports")}>
                Preview branded report →
              </button>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <section className="panel metric">
      <p className="muted">{label}</p>
      <strong>{value}</strong>
      <small>{note}</small>
    </section>
  );
}
