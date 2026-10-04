import Link from "next/link";
import { IndustryArt } from "./marketing";

const integrations = [
  [
    "ArduPilot",
    ".bin DataFlash logs",
    "Import supported flight and battery messages in the local dashboard. Available fields depend on the recorded log.",
    "Local import available",
  ],
  [
    "Mission Planner",
    ".tlog telemetry logs",
    "Import supported MAVLink telemetry messages. Review timestamps and flight boundaries before exporting.",
    "Local import available",
  ],
  [
    "CubePilot",
    "Cube Orange / Blue",
    "ArduPilot .bin logs use the local DataFlash parser. Compatibility depends on the installed firmware and recorded messages.",
    "Sample validation required",
  ],
  [
    "Pixhawk & PX4",
    "Autopilot ecosystem",
    "ArduPilot .bin and supported MAVLink .tlog formats can be imported. PX4 .ulg files are not supported yet.",
    "Compatibility depends on format",
  ],
  [
    "QGroundControl",
    "Ground control station",
    "Supported MAVLink .tlog files can be imported locally. Other recording formats need separate validation.",
    "Sample validation required",
  ],
  [
    "Kisan ag-drone autopilots",
    "Indian agricultural fleets",
    "Vendor log samples are needed to confirm the format and available battery measurements.",
    "Vendor validation pending",
  ],
];
export function IntegrationHub() {
  return (
    <section className="public-section section-soft">
      <div className="public-container">
        <div className="section-heading">
          <p className="section-kicker">YOUR HARDWARE. ONE WORKSPACE.</p>
          <h2>Your autopilot & hardware stack.</h2>
          <p>
            Supported log imports and compatibility checks for the equipment
            your team uses. File import does not require a live connection to
            your aircraft.
          </p>
        </div>
        <div className="integration-grid">
          {integrations.map(([title, format, text, status]) => (
            <article className="public-card integration-card" key={title}>
              <div>
                <h3>{title}</h3>
                <strong>{format}</strong>
                <p>{text}</p>
                <span className="status-pill">{status}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
export const guides = [
  {
    slug: "battery-records",
    category: "BATTERY OPERATIONS",
    title: "Build a clearer record of LiPo voltage sag",
    description:
      "Identify each pack, preserve the load context, and review comparable observations.",
    kind: 0,
    body: [
      "Start with a unique physical battery identifier and record its rated capacity and cell count.",
      "Keep raw voltage and current observations with flight context. A partial discharge alone does not establish full usable capacity.",
      "Compare qualified measurements under similar conditions. Treat estimated health as a review aid and follow your battery manufacturer’s operating limits.",
    ],
    source:
      "https://ardupilot.org/copter/docs/common-power-module-configuration-in-mission-planner.html",
    sourceLabel: "ArduPilot battery monitoring documentation",
  },
  {
    slug: "audit-records",
    category: "DGCA RECORD PREPARATION",
    title: "Prepare a flight record pack for review",
    description:
      "Bring pilot, aircraft and mission evidence together before preparing your submission.",
    kind: 3,
    body: [
      "Gather the aircraft identity, pilot credentials, mission purpose, flight timestamps and source logs.",
      "Document the applicable airspace restrictions and permission evidence for the operation. A takeoff coordinate alone does not describe an entire route.",
      "Have a reviewer check the records and confirm the receiving portal’s current format. LogSkies does not yet offer a verified eGCA bulk-upload template.",
    ],
    source: "https://digitalsky.dgca.gov.in/assets/files/dronerules.pdf",
    sourceLabel:
      "Official Drone Rules 2021 (check subsequent amendments and current restrictions)",
  },
  {
    slug: "ardupilot-logs",
    category: "TELEMETRY GUIDES",
    title: "Extract ArduPilot .bin files for flight review",
    description:
      "Find the onboard log and retain an original copy alongside your operational record.",
    kind: 1,
    body: [
      "Connect the autopilot to Mission Planner and open the DataFlash Logs tab in the DATA view.",
      "Choose Download DataFlash Log Via Mavlink and select the logs to download. Mission Planner saves them in its logs directory.",
      "Retain the original log. DataFlash logs are recorded onboard; .tlog files are recorded by the ground station over the telemetry connection.",
    ],
    source:
      "https://ardupilot.org/planner/docs/common-downloading-and-analyzing-data-logs-in-mission-planner.html",
    sourceLabel: "ArduPilot: downloading and analyzing DataFlash logs",
  },
];
export function KnowledgeHub() {
  return (
    <section className="public-section public-container">
      <div className="section-heading">
        <p className="section-kicker">THE KNOWLEDGE HUB</p>
        <h2>Operational guides for commercial pilots.</h2>
        <p>
          Practical introductions to battery records, telemetry and compliance
          evidence.
        </p>
      </div>
      <div className="industry-grid">
        {guides.map((guide) => (
          <article className="public-card industry-card" key={guide.slug}>
            <IndustryArt kind={guide.kind} />
            <div className="card-body">
              <span className="guide-category">{guide.category}</span>
              <h3>{guide.title}</h3>
              <p>{guide.description}</p>
              <Link href={`/knowledge-hub/${guide.slug}`}>Read guide →</Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
export const faqs = [
  [
    "What can I use in the online workspace today?",
    "Create and confirm an account, create your organization, register batteries and drones, download battery QR labels, save preflight associations and upload your company logo. These records are stored in Supabase and persist after reload. Android uses the same backend; real-device validation is still pending. Imported flight history remains local to the dashboard browser.",
  ],
  [
    "How does the 15-day trial work?",
    "A 15-day trial is planned for launch. Enrollment and billing are not active yet; the interactive demo is available now, and you can prepare an inquiry for launch access.",
  ],
  [
    "Can I pay with UPI AutoPay?",
    "UPI AutoPay is planned. Payment processing and recurring subscriptions have not been connected.",
  ],
  [
    "Can pilots scan without internet in rural areas?",
    "The first release is online-only. Shared fleet data and preflight records require an internet connection; offline sync is not included yet.",
  ],
  [
    "Does an altitude below 120 m mean a flight is compliant?",
    "No. Applicable airspace restrictions, permissions, pilot credentials and other requirements must also be checked. Some green-zone areas near airports have a lower vertical limit. Use official current information before flight.",
  ],
  [
    "Can our logo appear on the report?",
    "Yes. Upload your organization’s logo in the workspace to include it in printable report headers. Current reports are drafts with visible evidence gaps.",
  ],
  [
    "Is the report already audit-ready?",
    "Reports include parsed telemetry, company branding, source-file hashes and a pass/fail/pending evidence checklist. They remain drafts: official eGCA format acceptance, authoritative airspace information and operator evidence must be verified before a compliance claim.",
  ],
  [
    "Which flight logs can I import?",
    "The local dashboard accepts ArduPilot DataFlash .bin and supported MAVLink .tlog files up to 50 MB. PX4 .ulg files are not supported yet. Available measurements depend on the source log; customer logs still need validation.",
  ],
  [
    "Where are imported flight records stored?",
    "Flight logs, observations and reviews are saved in this browser. They do not yet sync to Android or another computer. Clearing site data removes them, so retain original logs and export evidence backups.",
  ],
  [
    "Does every flight produce a battery health score?",
    "No. Capacity and voltage-sag scores require sufficient measurements, a qualified discharge and comparable baseline conditions. Missing evidence leaves health unassessed. A QR scan identifies the pack; it does not measure battery health.",
  ],
  [
    "How is a flight linked to a battery?",
    "A complete parsed interval can match one unused preflight for the same aircraft within 30 minutes. Missing or ambiguous matches require the pilot to select the physical pack. Review arming intervals against actual takeoff and landing.",
  ],
  [
    "How can I download a report?",
    "Open Reports in the local dashboard after importing a flight. Add your company name and logo under Company settings, review the flight evidence, then use Print / Save PDF, flight CSV or evidence JSON. PDF layout and file downloads still need final browser validation.",
  ],
];
export function FaqSection() {
  return (
    <section className="public-section public-container faq-container">
      <div className="section-heading">
        <p className="section-kicker">A FEW THINGS TO KNOW</p>
        <h2>Your questions, answered.</h2>
      </div>
      {faqs.map(([question, answer]) => (
        <details className="faq-item" key={question}>
          <summary>
            {question}
            <span aria-hidden="true">+</span>
          </summary>
          <p>{answer}</p>
        </details>
      ))}
    </section>
  );
}
