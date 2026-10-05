import Link from "next/link";
import Image from "next/image";
import { CallToAction } from "@/components/marketing";
import FlightStory from "@/components/flight-story";
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
export default function Home() {
  return (
    <main className="public-page">
      <section className="home-hero">
        <div className="public-container home-hero-grid">
          <div>
            <p className="hero-badge">
              ✣ Battery intelligence. Clearer flight records.
            </p>
            <h1>
              Turn flight logs into
              <br />
              <span>clear fleet records.</span>
            </h1>
            <p className="hero-description">
              Review flight routes and battery telemetry, then prepare reports
              with your company logo. One shared workspace for your drones,
              physical battery packs and flight evidence.
            </p>
            <div className="hero-actions">
              <Link href="/workspace" className="primary">
                Open your workspace →
              </Link>
              <Link href="/dashboard" className="secondary">
                Explore interactive demo
              </Link>
            </div>
            <p className="hero-note">
              Early access · Web workspace + Android preview
            </p>
          </div>
          <div className="photo-hero-card">
            <Image
              src="/images/industries/agriculture.png"
              width={1536}
              height={1024}
              alt="Agricultural spray drone hovering above lush green rice fields"
              preload
              className="hero-photo"
              sizes="(max-width: 1000px) 100vw, 600px"
            />
            <div className="hero-photo-tag">AGRICULTURE & SPRAYING</div>
            <div className="hero-photo-panel">
              <div className="photo-panel-heading">
                <strong>BATT-AG-001</strong>
                <span className="status-pill">Example pack</span>
              </div>
              <div className="photo-metrics">
                <div>
                  <small>Pack type</small>
                  <strong>
                    LiPo<em> 6S</em>
                  </strong>
                </div>
                <div>
                  <small>Capacity</small>
                  <strong>
                    16,000<em> mAh</em>
                  </strong>
                </div>
                <div>
                  <small>Health</small>
                  <strong>Review</strong>
                </div>
              </div>
              <div className="photo-audit">
                <span>✣ Branded flight report</span>
                <strong>Draft · review pending</strong>
              </div>
            </div>
            <p className="photo-disclaimer">
              Illustrative image and sample data. Health and compliance are not
              verified.
            </p>
          </div>
        </div>
      </section>
      <section className="benefit-strip">
        <div className="public-container">
          <span>BUILT FOR INDIAN UAV TEAMS</span>
          <strong>Physical pack identity</strong>
          <strong>Shared fleet records</strong>
          <strong>Your logo on reports</strong>
        </div>
      </section>
      <FlightStory />
      <IntegrationHub />
      <IndustryExplorer />
      <WorkflowDemo />
      <section className="public-section public-container two-columns story-section">
        <div>
          <p className="section-kicker">YOUR COMPANY. YOUR RECORDS.</p>
          <h2>
            A report that carries
            <br />
            your identity.
          </h2>
          <p className="large-copy">
            Your company logo, pilot details and flight evidence in one clear
            record pack. Review missing evidence before presenting a report for
            an audit.
          </p>
          <Link href="/dashboard" className="primary">
            Preview branded reports →
          </Link>
        </div>
        <div className="paper-preview">
          <div className="paper-company">
            <span className="paper-logo">✣</span>
            <div>
              <strong>Your organization</strong>
              <small>Flight & battery record pack</small>
            </div>
            <span className="draft-stamp">DRAFT</span>
          </div>
          <div className="paper-line" />
          <h3>Evidence checklist</h3>
          {[
            "Drone identity",
            "Pilot credentials",
            "Flight telemetry",
            "Airspace evidence",
          ].map((item) => (
            <div className="paper-row" key={item}>
              <span>{item}</span>
              <span>Pending</span>
            </div>
          ))}
          <p>Readiness is reviewed, never assumed.</p>
        </div>
      </section>
      <section className="section-soft">
        <div className="public-container section-heading pricing-home-heading">
          <p className="section-kicker">GROW WITH YOUR FLEET</p>
          <h2>Start with the tools your fleet needs.</h2>
        </div>
        <PricingMatrix />
      </section>
      <KnowledgeHub />
      <FaqSection />
      <CallToAction />
    </main>
  );
}
