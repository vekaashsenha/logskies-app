import Link from "@/components/account-link";

export default function FlightStory() {
  return (
    <section className="public-section flight-story" aria-labelledby="flight-story-title">
      <div className="public-container">
        <div className="section-heading">
          <p className="section-kicker">FROM FILE TO FLIGHT RECORD</p>
          <h2 id="flight-story-title">Every flight. Every battery. One clear record.</h2>
          <p>Bring the log. Review the evidence. Share a report that carries your identity.</p>
        </div>
        <ol className="flight-story-grid">
          <li>
            <div className="story-visual story-file">
              <span className="story-example">Illustrative workflow</span>
              <div className="story-file-icon" aria-hidden="true">↥</div>
              <strong>Your original flight log</strong>
              <div className="story-formats"><span>.bin</span><span>.tlog</span></div>
              <small>ArduPilot · supported MAVLink messages</small>
            </div>
            <span className="story-step">01 · UPLOAD</span>
            <h3>Start with your flight log.</h3>
            <p>Import the recorded file in the web workspace and associate the aircraft and battery pack.</p>
          </li>
          <li>
            <div className="story-visual story-analysis">
              <span className="story-example">Example route & voltage</span>
              <svg viewBox="0 0 320 150" role="img" aria-label="Illustrative flight route between two observed positions">
                <path d="M0 35H320M0 75H320M0 115H320M45 0V150M105 0V150M165 0V150M225 0V150M285 0V150" stroke="#ffffff12" fill="none" />
                <path d="M30 115C75 120 58 45 115 45S165 115 215 85S265 30 292 38" fill="none" stroke="#a7d875" strokeWidth="4" strokeLinecap="round" />
                <circle cx="30" cy="115" r="6" fill="#a7d875" /><circle cx="292" cy="38" r="6" fill="#fff" />
              </svg>
              <div className="story-chart"><span>Pack voltage</span><svg viewBox="0 0 200 40" aria-hidden="true"><path d="M0 8L25 10L45 18L60 12L85 22L110 17L130 27L155 22L175 32L200 34" stroke="#a7d875" strokeWidth="2" fill="none" /></svg></div>
            </div>
            <span className="story-step">02 · REVIEW</span>
            <h3>See the evidence together.</h3>
            <p>Review route observations and available battery measurements. Missing or inconsistent data stays visible.</p>
          </li>
          <li>
            <div className="story-visual story-report">
              <div className="story-paper">
                <div className="story-paper-brand"><span aria-hidden="true">✣</span><strong>Your company logo</strong></div>
                <strong>Flight Operations Report</strong>
                <div className="story-report-row"><span>Flight & aircraft</span><span>Review</span></div>
                <div className="story-report-row"><span>Battery telemetry</span><span>Review</span></div>
                <div className="story-report-row"><span>Airspace evidence</span><span>Pending</span></div>
                <div className="story-signature">Operator signature __________________</div>
                <span className="story-draft">DRAFT · EVIDENCE NEEDS REVIEW</span>
              </div>
            </div>
            <span className="story-step">03 · EXPORT</span>
            <h3>Put your name on the record.</h3>
            <p>Prepare a branded report through Print / Save PDF, with CSV and evidence JSON available on the web.</p>
          </li>
        </ol>
        <div className="story-footnote">
          <p>Android supports battery QR and preflight workflows, shared flight summaries and opening web reports. Available data depends on the log; reports require operator review.</p>
          <Link href="/signup" className="secondary">Explore the workflow →</Link>
        </div>
      </div>
    </section>
  );
}
