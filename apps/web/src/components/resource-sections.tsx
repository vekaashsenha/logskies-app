import Link from "next/link";
import { IndustryArt } from "./marketing";

const integrations = [
  ["AP", "ArduPilot", ".bin DataFlash logs", "Onboard flight and battery messages."],
  ["MP", "Mission Planner", ".tlog telemetry logs", "Ground-station telemetry; available fields vary."],
  ["CP", "CubePilot", "Cube Orange / Blue", "Compatibility depends on firmware and log format."],
  ["PX", "Pixhawk & PX4", "Autopilot ecosystem", "PX4 ULog support is a separate planned parser."],
  ["QG", "QGroundControl", "Ground control station", "Log support depends on the connected autopilot."],
  ["AG", "Kisan ag-drone autopilots", "Indian agricultural fleets", "Vendor log samples required for verification."],
];
export function IntegrationHub() {
  return <section className="public-section section-soft"><div className="public-container"><div className="section-heading"><p className="section-kicker">YOUR HARDWARE. ONE WORKSPACE.</p><h2>Your autopilot & hardware stack.</h2><p>Integration roadmap for the equipment your team already uses. Parsers are in development.</p></div><div className="integration-grid">{integrations.map(([icon, title, format, text]) => <article className="public-card integration-card" key={title}><span className="integration-icon">{icon}</span><div><h3>{title}</h3><strong>{format}</strong><p>{text}</p><span className="status-pill">Planned · validation pending</span></div></article>)}</div></div></section>;
}
export const guides = [
  {slug:"battery-records", category:"BATTERY OPERATIONS", title:"Build a clearer record of LiPo voltage sag", description:"Identify each pack, preserve the load context, and review comparable observations.", kind:0, body:["Start with a unique physical battery identifier and record its rated capacity and cell count.", "Keep raw voltage and current observations with flight context. A partial discharge alone does not establish full usable capacity.", "Compare qualified measurements under similar conditions. Treat estimated health as a review aid and follow your battery manufacturer’s operating limits."], source:"https://ardupilot.org/copter/docs/common-power-module-configuration-in-mission-planner.html", sourceLabel:"ArduPilot battery monitoring documentation"},
  {slug:"audit-records", category:"DGCA RECORD PREPARATION", title:"Prepare a flight record pack for review", description:"Bring pilot, aircraft and mission evidence together before preparing your submission.", kind:3, body:["Gather the aircraft identity, pilot credentials, mission purpose, flight timestamps and source logs.", "Document the applicable airspace restrictions and permission evidence for the operation. A takeoff coordinate alone does not describe an entire route.", "Have a reviewer check the records and confirm the receiving portal’s current format. LogSkies does not yet offer a verified eGCA bulk-upload template."], source:"https://digitalsky.dgca.gov.in/assets/files/dronerules.pdf", sourceLabel:"Official Drone Rules 2021 (check subsequent amendments and current restrictions)"},
  {slug:"ardupilot-logs", category:"TELEMETRY GUIDES", title:"Extract ArduPilot .bin files for flight review", description:"Find the onboard log and retain an original copy alongside your operational record.", kind:1, body:["Connect the autopilot to Mission Planner and open the DataFlash Logs tab in the DATA view.", "Choose Download DataFlash Log Via Mavlink and select the logs to download. Mission Planner saves them in its logs directory.", "Retain the original log. DataFlash logs are recorded onboard; .tlog files are recorded by the ground station over the telemetry connection."], source:"https://ardupilot.org/planner/docs/common-downloading-and-analyzing-data-logs-in-mission-planner.html", sourceLabel:"ArduPilot: downloading and analyzing DataFlash logs"},
];
export function KnowledgeHub() {
  return <section className="public-section public-container"><div className="section-heading"><p className="section-kicker">THE KNOWLEDGE HUB</p><h2>Operational guides for commercial pilots.</h2><p>Practical introductions to battery records, telemetry and compliance evidence.</p></div><div className="industry-grid">{guides.map(guide => <article className="public-card industry-card" key={guide.slug}><IndustryArt kind={guide.kind}/><div className="card-body"><span className="guide-category">{guide.category}</span><h3>{guide.title}</h3><p>{guide.description}</p><Link href={`/knowledge-hub/${guide.slug}`}>Read guide →</Link></div></article>)}</div></section>;
}
export const faqs = [
  ["How does the 15-day trial work?", "A 15-day trial is planned for launch. Enrollment and billing are not active yet; the interactive demo is available now, and you can prepare an inquiry for launch access."],
  ["Can I pay with UPI AutoPay?", "UPI AutoPay is planned. Payment processing and recurring subscriptions have not been connected."],
  ["Can pilots scan without internet in rural areas?", "The first release is online-only. Shared fleet data and preflight records require an internet connection; offline sync is not included yet."],
  ["Does an altitude below 120 m mean a flight is compliant?", "No. Applicable airspace restrictions, permissions, pilot credentials and other requirements must also be checked. Some green-zone areas near airports have a lower vertical limit. Use official current information before flight."],
  ["Can our logo appear on the report?", "Yes. Upload your organization’s logo in the workspace to include it in printable report headers. Current reports are drafts with visible evidence gaps."],
  ["Is the report already audit-ready?", "Official export format verification, real flight telemetry, applicable airspace checks and reviewer approval are still pending. The demo is not a certification of compliance."],
];
export function FaqSection() {
  return <section className="public-section public-container faq-container"><div className="section-heading"><p className="section-kicker">A FEW THINGS TO KNOW</p><h2>Your questions, answered.</h2></div>{faqs.map(([question,answer]) => <details className="faq-item" key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</section>;
}
