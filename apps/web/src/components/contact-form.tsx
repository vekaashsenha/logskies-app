import Link from "next/link";
export default function ContactForm() {
  return (
    <div className="public-card form-grid">
      <h2>Get started with LogSkies</h2>
      <p>
        Create your account to register your fleet, record preflights and
        prepare Flight Operations Reports.
      </p>
      <Link href="/workspace" className="primary">
        Open your workspace →
      </Link>
      <Link href="/faq" className="secondary">
        Read frequently asked questions
      </Link>
      <p className="muted">
        A public support channel is being finalized. This page does not collect
        or send inquiries.
      </p>
    </div>
  );
}
