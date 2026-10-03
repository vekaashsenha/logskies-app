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
import { IndustryExplorer, WorkflowDemo, PricingMatrix } from "@/components/interactive-marketing";
import { IntegrationHub, KnowledgeHub, FaqSection } from "@/components/resource-sections";
const sections = ["solutions", "features", "pricing", "faq", "contact", "integrations", "dgca-compliance", "knowledge-hub", "privacy"];
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
    title:
      section === "faq"
        ? "FAQ"
        : section.charAt(0).toUpperCase() + section.slice(1),
  };
}
const features = [
  [
    "QR battery identity",
    "Give each physical pack a unique identifier and scan it from the Android field app.",
    "Available in the prototype",
  ],
  [
    "Fleet inventory",
    "Register batteries and drones with clear asset tags and organization-level access.",
    "Available in the prototype",
  ],
  [
    "Shared preflight records",
    "Associate a pack and drone before flight, using the same online workspace across web and Android.",
    "Requires Supabase setup",
  ],
  [
    "Company-branded reports",
    "Upload your logo and prepare printable draft record packs with visible evidence status.",
    "Available in the prototype",
  ],
  [
    "Telemetry processing",
    "Import supported .bin and .tlog files locally, review flight intervals and reconcile battery associations.",
    "Available in the local dashboard",
  ],
  [
    "Battery health & audit evidence",
    "Qualified measurements and verified requirements will support battery estimates and report review.",
    "In development",
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
                    <Link href="/dashboard">Explore the workflow →</Link>
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
            title="A plan for your next stage."
            description="Proposed launch plans for individual operators and growing fleet teams. Explore the product now while subscriptions and final plan limits are being prepared."
          />
          <PricingMatrix />
        </>
      )}
      {section === "faq" && (
        <>
          <PageIntro
            label="FREQUENTLY ASKED QUESTIONS"
            title="A clearer picture of LogSkies."
            description="Understand the workflow, the current MVP and what is being built next."
          />
          <FaqSection />
        </>
      )}
      {section === "contact" && (
        <>
          <PageIntro
            label="LET’S TALK OPERATIONS"
            title="Tell us what your fleet needs."
            description="Whether you fly agricultural missions, map a site or manage a training fleet, your workflow helps shape what comes next."
          />
          <section className="public-section public-container contact-grid">
            <div>
              <p className="section-kicker">START WITH YOUR WORKFLOW</p>
              <h2>Make the next conversation useful.</h2>
              <p className="large-copy">
                Tell us about your fleet size, how you identify batteries today,
                and the records your team needs to prepare.
              </p>
              <ul className="check-list">
                <li>What kind of missions do you fly?</li>
                <li>How many pilots and drones are involved?</li>
                <li>Where does your current workflow get difficult?</li>
              </ul>
              <Link href="/dashboard" className="secondary">
                Explore the demo first →
              </Link>
            </div>
            <ContactForm />
          </section>
        </>
      )}
      {section === "integrations" && <><PageIntro label="HARDWARE & LOG FORMATS" title="Connect the context behind your flights." description="An integration roadmap for onboard logs, ground stations and agricultural autopilots. Actual compatibility will be verified with real sample logs."/><IntegrationHub/><WorkflowDemo/></>}
      {section === "knowledge-hub" && <><PageIntro label="LOGSKIES KNOWLEDGE HUB" title="Make your records work harder." description="Practical guides for commercial drone teams: physical battery identities, source logs and reviewable operational evidence."/><KnowledgeHub/></>}
      {section === "dgca-compliance" && <><PageIntro label="COMPLIANCE RECORD PREPARATION" title="Evidence first. Clearer audit preparation." description="Keep the aircraft, pilot, mission and permission evidence together, with your company logo on every report draft."/><section className="public-section public-container"><div className="feature-grid">{[["Flight evidence", "Source logs, timestamps, coordinates and qualified altitude measurements."], ["Operational permissions", "Applicable airspace restrictions across the flight route, with permission references."], ["Pilot & reviewer", "Pilot credentials at the flight date and a documented review of missing evidence."]].map(([title,text])=><article className="public-card" key={title}><h2>{title}</h2><p>{text}</p><span className="status-pill">Verification pipeline in development</span></article>)}</div><p className="notice compliance-note">Current exports are drafts. Official eGCA schema verification and automated compliance checks are pending. LogSkies is independent and is not endorsed by DGCA.</p><p>Consult the <a href="https://digitalsky.dgca.gov.in/assets/files/dronerules.pdf" target="_blank" rel="noreferrer">official Drone Rules</a>, subsequent amendments and current operational restrictions before flight.</p><Link href="/dashboard" className="primary">Preview a company-branded draft →</Link></section><FaqSection/></>}
      {section === "privacy" && <><PageIntro label="PROTOTYPE DATA INFORMATION" title="Understand where your records live." description="This prototype disclosure describes the current implementation. A full production privacy policy will be published before launch."/><section className="public-section public-container guide-article"><h2>Local demo</h2><p>Demo fleet records and uploaded branding are stored in this browser’s local storage. Clearing site data removes these local records.</p><h2>Connected workspace</h2><p>When configured, Supabase handles account authentication, organization fleet records and private storage for logos and logs. The project owner must configure and verify the service before use.</p><h2>Contact drafts</h2><p>The contact form creates an inquiry draft locally. It does not send your details to a sales team.</p><h2>Before production</h2><p>Retention periods, account deletion, privacy contact details and any analytics services must be defined before production onboarding.</p></section></>}
      {section !== "contact" && <CallToAction />}
    </main>
  );
}
