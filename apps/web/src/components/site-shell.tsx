"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAccountSession } from "@/components/account-link";
const links = [
  ["Solutions", "/solutions"],
  ["Features", "/features"],
  ["Integrations", "/integrations"],
  ["Flight Reports", "/dgca-compliance"],
  ["Pricing", "/pricing"],
  ["Knowledge Hub", "/knowledge-hub"],
];
export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { signedIn, loaded } = useAccountSession();
  return (
    <header className="site-header no-print">
      <div className="site-nav-wrap">
        <Link
          href="/"
          className="site-logo"
          aria-label="LogSkies home"
          onClick={() => setOpen(false)}
        >
          <span className="logo-symbol">✣</span>
          <span>
            Log<span className="logo-light">Skies</span>
          </span>
        </Link>
        <button
          className="menu-toggle"
          aria-label={open ? "Close navigation" : "Open navigation"}
          aria-expanded={open}
          aria-controls="site-navigation"
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>
        <nav
          id="site-navigation"
          className={`site-navigation ${open ? "is-open" : ""}`}
        >
          {links.map(([name, href]) => (
            <Link
              key={href}
              href={
                signedIn && name === "Flight Reports"
                  ? "/workspace#flight-history"
                  : href
              }
              aria-current={path === href ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {name}
            </Link>
          ))}
          <Link
            href="/contact"
            className="nav-demo"
            onClick={() => setOpen(false)}
          >
            Help & contact
          </Link>
          {loaded && !signedIn && (
            <>
              <Link
                href="/signin"
                className="nav-signin"
                onClick={() => setOpen(false)}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="nav-signin"
                onClick={() => setOpen(false)}
              >
                Sign up
              </Link>
            </>
          )}
          {signedIn && (
            <Link
              href="/workspace"
              className="nav-signin"
              onClick={() => setOpen(false)}
            >
              My fleet
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
export function SiteFooter() {
  const { signedIn, loaded } = useAccountSession();
  return (
    <footer className="site-footer no-print">
      <div className="footer-grid">
        <div>
          <Link href="/" className="site-logo">
            <span className="logo-symbol">✣</span>LogSkies
          </Link>
          <p>
            Clearer records. Better fleet decisions.
            <br />
            Built for drone operators in India.
          </p>
        </div>
        <div>
          <strong>Explore LogSkies</strong>
          <Link href="/solutions">Industry solutions</Link>
          <Link href="/features">Platform features</Link>
          <Link href="/pricing">Plans & pricing</Link>
        </div>
        <div>
          <strong>Get started</strong>
          {loaded && (
            <Link href={signedIn ? "/workspace" : "/signup"}>
              {signedIn ? "My fleet" : "Sign up / Sign in"}
            </Link>
          )}
          <Link href="/contact">Contact</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms and Conditions</Link>
          <a href="mailto:support@logskies.com">Support & privacy email</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} LogSkies</span>
        <span>
          Independent platform. Report drafts require evidence review; no DGCA
          endorsement.
        </span>
      </div>
    </footer>
  );
}
