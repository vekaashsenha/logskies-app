import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  PageIntro,
  CallToAction,
  IndustryArt,
  industries,
} from "@/components/marketing";
import ContactForm from "@/components/contact-form";
import LegalPolicy from "@/components/legal-policy";
import {
  IndustryExplorer,
  WorkflowDemo,
  PricingMatrix,
} from "@/components/interactive-marketing";
import {
  IntegrationHub,
  KnowledgeHub,
  FaqSection,
} from "@/components/resource-sections";
const sections = [
  "solutions",
  "features",
  "pricing",
  "faq",
  "contact",
  "integrations",
  "dgca-compliance",
  "knowledge-hub",
  "privacy",
  "terms",
];
export function generateStaticParams() {
  return sections.map((section) => ({ section }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  return {
    alternates: { canonical: `/${section}` },
    title:
      section === "dgca-compliance"
        ? "Flight Operations Reports"
        : section === "faq"
          ? "FAQ"
          : section.charAt(0).toUpperCase() + section.slice(1),
  };
}
const features = [
  [
    "QR battery identity",
    "Give each physical pack a unique identifier and scan it from the Android field app.",
    "Available in the online workspace",
  ],
  [
    "Fleet inventory",
    "Register batteries and drones with clear asset tags and organization-level access.",
    "Available in the online workspace",
  ],
  [
    "Shared preflight records",
    "Associate a pack and drone before flight, using the same online workspace across web and Android.",
    "Available in the online workspace",
  ],
  [
    "Company-branded reports",
    "Upload your logo and prepare printable draft record packs with visible evidence status.",
    "Available in the online workspace",
  ],
  [
    "Telemetry processing",
    "Parse supported .bin, .tlog and .ulg files on your device, save private organization flight history and reconcile battery associations.",
    "Available in the online workspace",
  ],
  [
    "Recorded flight-path replay",
    "Replay GPS observations on a local coordinate map with synchronized battery readings, a scrub timeline and visible data gaps. Android opens this view in the web workspace.",
    "Available on the web · no 3D terrain",
  ],
  [
    "Battery health & audit evidence",
    "Review qualified capacity and voltage-sag estimates alongside a pass/fail/pending flight evidence checklist. Missing measurements remain unassessed.",
    "Local estimates and evidence review available",
  ],
];
export default async function Section({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  if (!sections.includes(section)) notFound();
  return (
    <main className="public-page">
      {section === "solutions" && (
        <>
          <PageIntro
            label="LOGSKIES SOLUTIONS"
            title="Different missions. One clear workflow."
            description="Every industry operates differently. Keep the battery identities, fleet context and operational records behind your work together in a workspace built for commercial drone teams."
          >
            <Link href="/contact" className="button-outline-light">
              Find the right fit for your team →
            </Link>
          </PageIntro>
          <IndustryExplorer />
          <section className="public-section public-container">
            <div className="industry-grid">
              {industries.map((item) => (
                <article className="public-card industry-card" key={item.title}>
                  <IndustryArt kind={item.kind} />
                  <div className="card-body">
                    <h2>LogSkies for {item.title}</h2>
                    <p>{item.description}</p>
                    <ul className="check-list">
                      {item.points.map((point) => (
                        <li key={point}>{point}</li>
                      ))}
                    </ul>
                    <Link href="/workspace">Explore the workflow →</Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section className="section-soft public-section">
            <div className="public-container two-columns">
              <div>
                <p className="section-kicker">
                  YOUR ORGANIZATION, RECOGNIZABLE
                </p>
                <h2>
                  Keep your company identity
                  <br />
                  on every report.
                </h2>
                <p className="large-copy">
                  Company names and uploaded logos carry through to report
                  drafts, keeping your operational records recognizable and
                  ready for review.
                </p>
              </div>
              <div className="public-card">
                <h3>A consistent workspace</h3>
                <ul className="check-list">
                  <li>Organization-based fleet access</li>
                  <li>Shared web and Android records</li>
                  <li>Company-logo report headers</li>
                  <li>Clear pending evidence and review status</li>
                </ul>
                <Link href="/features">See platform features →</Link>
              </div>
            </div>
          </section>
        </>
      )}
      {section === "features" && (
        <>
          <PageIntro
            label="PLATFORM FEATURES"
            title="The record behind every mission."
            description="Practical tools for the fleet manager at a desk and the pilot in the field. Start with physical equipment, capture the preflight, and prepare a clearer operational record."
          />
          <section className="public-section public-container">
            <div className="feature-grid">
              {features.map(([title, description, status], index) => (
                <article className="public-card" key={title}>
                  <span className="feature-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h2>{title}</h2>
                  <p>{description}</p>
                  <span className="status-pill">{status}</span>
                </article>
              ))}
            </div>
          </section>
          <WorkflowDemo />
          <section className="section-soft public-section">
            <div className="public-container two-columns">
              <div>
                <p className="section-kicker">WEB + ANDROID</p>
                <h2>
                  Manage on the web.
                  <br />
                  Identify in the field.
                </h2>
                <p className="large-copy">
                  Use the web workspace to organize your fleet, download QR
                  labels and prepare branded reports. Use Android to select the
                  drone, scan the battery and capture the preflight.
                </p>
              </div>
              <div className="public-card">
                <h3>Your first connected workflow</h3>
                <ol className="workflow-list">
                  <li>Register a battery and drone.</li>
                  <li>Download and attach the pack’s QR label.</li>
                  <li>Scan the battery on Android.</li>
                  <li>Save the association and review it on web.</li>
                </ol>
                <Link href="/workspace">Open your workspace →</Link>
              </div>
            </div>
          </section>
        </>
      )}
      {section === "pricing" && (
        <>
          <PageIntro
            label="PLANS & PRICING"
            title="Start with early access."
            description="Explore the early-access workspace. Paid subscriptions and final plan limits will be announced when billing opens."
          />
          <PricingMatrix />
        </>
      )}
      {section === "faq" && (
        <>
          <PageIntro
            label="FREQUENTLY ASKED QUESTIONS"
            title="A clearer picture of LogSkies."
            description="Find out how to manage your fleet, share records and prepare flight reports."
          />
          <FaqSection />
        </>
      )}
      {section === "contact" && (
        <>
          <PageIntro
            label="LET’S TALK OPERATIONS"
            title="Start with your fleet workflow."
            description="Explore the workspace and find answers about equipment, flight records and reports."
          />
          <section className="public-section public-container contact-grid">
            <div>
              <p className="section-kicker">START WITH YOUR WORKFLOW</p>
              <h2>Bring your operation together.</h2>
              <p className="large-copy">
                Register your equipment, identify each physical battery and keep
                the evidence behind your flight records together.
              </p>
              <ul className="check-list">
                <li>Register drones and battery packs.</li>
                <li>Capture preflights on web and Android.</li>
                <li>Review flight evidence before exporting reports.</li>
              </ul>
              <Link href="/workspace" className="secondary">
                Open your workspace →
              </Link>
            </div>
            <ContactForm />
          </section>
        </>
      )}
      {section === "integrations" && (
        <>
          <PageIntro
            label="HARDWARE & LOG FORMATS"
            title="Connect the context behind your flights."
            description="Import supported onboard and ground-station logs, preserve the original evidence and review your flight records. Compatibility depends on firmware and the recorded log format."
          />
          <IntegrationHub />
          <WorkflowDemo />
        </>
      )}
      {section === "knowledge-hub" && (
        <>
          <PageIntro
            label="LOGSKIES KNOWLEDGE HUB"
            title="Make your records work harder."
            description="Practical guides for commercial drone teams: physical battery identities, source logs and reviewable operational evidence."
          />
          <KnowledgeHub />
        </>
      )}
      {section === "dgca-compliance" && (
        <>
          <PageIntro
            label="COMPLIANCE RECORD PREPARATION"
            title="Evidence first. Clearer audit preparation."
            description="Keep the aircraft, pilot, mission and permission evidence together, with your company logo on every report draft."
          />
          <section className="public-section public-container">
            <div className="feature-grid">
              {[
                [
                  "Flight evidence",
                  "Source logs, timestamps, coordinates and qualified altitude measurements.",
                ],
                [
                  "Operational permissions",
                  "Dated full-route and temporary-restriction checks, permission authority and private supporting documents.",
                ],
                [
                  "Pilot & reviewer",
                  "Pilot credentials at the flight date and a documented review of missing evidence.",
                ],
              ].map(([title, text]) => (
                <article className="public-card" key={title}>
                  <h2>{title}</h2>
                  <p>{text}</p>
                  <span className="status-pill">Flight evidence review</span>
                </article>
              ))}
            </div>
            <p className="notice compliance-note">
              Current exports are drafts. Local checks cover credential dates,
              reviewed altitude and permission evidence. Official eGCA format
              acceptance and authoritative airspace verification remain pending.
              LogSkies is independent and is not endorsed by DGCA.
            </p>
            <p>
              Consult the{" "}
              <a
                href="https://digitalsky.dgca.gov.in/assets/files/dronerules.pdf"
                target="_blank"
                rel="noreferrer"
              >
                official Drone Rules
              </a>
              , subsequent amendments and current operational restrictions
              before flight.
            </p>
            <Link href="/workspace" className="primary">
              Prepare a company-branded report →
            </Link>
          </section>
          <FaqSection />
        </>
      )}
      {section === "terms" && (
        <>
          <PageIntro
            label="LEGAL"
            title="Terms and Conditions"
            description="Terms for using the LogSkies web workspace and Android application."
          />
          <LegalPolicy kind="terms" />
        </>
      )}
      {section === "privacy" && (
        <>
          <PageIntro
            label="PRIVACY & DATA"
            title="Privacy Policy"
            description="How LogSkies handles your account, fleet, flight records and support requests."
          />
          <LegalPolicy kind="privacy" />
        </>
      )}
      {section !== "contact" && <CallToAction />}
    </main>
  );
}
