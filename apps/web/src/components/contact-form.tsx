"use client";
import { useState } from "react";
export default function ContactForm() {
  const [draft, setDraft] = useState("");
  const [message, setMessage] = useState("");
  return (
    <form
      className="public-card form-grid contact-form"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        setDraft(
          `LogSkies inquiry\n\nName: ${data.get("name")}\nCompany: ${data.get("company")}\nEmail: ${data.get("email")}\nFleet size: ${data.get("fleetSize")}\nAutopilot: ${data.get("autopilot")}\nIndustry: ${data.get("industry")}\n\n${data.get("message")}`,
        );
        setMessage("Your draft is ready below. No message has been sent.");
      }}
    >
      <h2>Tell us about your operation</h2>
      <p className="muted">
        Our contact channel is being set up. Prepare and save your inquiry
        below; this form does not send a message.
      </p>
      <div className="form-row">
        <label>
          Full name
          <input name="name" required autoComplete="name" maxLength={120} />
        </label>
        <label>
          Company
          <input
            name="company"
            required
            autoComplete="organization"
            maxLength={120}
          />
        </label>
      </div>
      <label>
        Work email
        <input name="email" required type="email" autoComplete="email" />
      </label>
      <label>
        Fleet size (drones)
        <input name="fleetSize" type="number" min="1" max="100000" required />
      </label>
      <label>
        Autopilot
        <select name="autopilot"><option>ArduPilot</option><option>PX4 / Pixhawk</option><option>CubePilot</option><option>Kisan ag-drone autopilot</option><option>Other / not sure</option></select>
      </label>
      <label>
        Industry
        <select name="industry">
          <option>Agriculture & spraying</option>
          <option>Surveying & mapping</option>
          <option>Mining</option>
          <option>Training / RPTO</option>
          <option>Infrastructure inspection</option>
          <option>Other commercial operations</option>
        </select>
      </label>
      <label>
        What does your team need?
        <textarea
          name="message"
          rows={5}
          required
          maxLength={3000}
          placeholder="Tell us about your fleet and current workflow."
        />
      </label>
      <button className="primary">Prepare inquiry draft →</button>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {draft && (
        <>
          <label>
            Inquiry draft
            <textarea readOnly rows={9} value={draft} />
          </label>
          <div className="actions">
            <a
              className="secondary"
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(draft)}`}
              download="logskies-inquiry.txt"
            >
              Download draft
            </a>
            <button
              type="button"
              className="secondary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(draft);
                  setMessage("Draft copied. No message has been sent.");
                } catch {
                  setMessage(
                    "Copy is unavailable. Select and copy the draft text above.",
                  );
                }
              }}
            >
              Copy draft
            </button>
          </div>
        </>
      )}
    </form>
  );
}
