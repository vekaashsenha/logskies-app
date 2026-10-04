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
        Email support and privacy requests to{" "}
        <a href="mailto:support@logskies.com">support@logskies.com</a>. Please
        do not send passwords or reset links.
      </p>
    </div>
  );
}
