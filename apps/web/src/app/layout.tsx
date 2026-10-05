import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "@/components/site-shell";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://logskies.com"),
  title: {
    default: "LogSkies | Drone fleet operations",
    template: "%s | LogSkies",
  },
  description:
    "Battery tracking, preflight workflows and branded flight records for drone operators in India.",
  openGraph: {
    type: "website",
    siteName: "LogSkies",
    title: "LogSkies | Drone fleet operations",
    description:
      "Track drone fleets, battery identities and pilot records, and prepare branded Flight Operations Reports.",
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#page-content">
          Skip to content
        </a>
        <SiteHeader />
        <div id="page-content">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
