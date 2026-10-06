import Link from "next/link";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Connected workspace",
  robots: { index: false, follow: false },
};
export default function FormerDemo() {
  return (
    <main className="content">
      <h1>Use your connected workspace</h1>
      <p>
        Sign in to manage your company's shared flight, drone and battery
        records.
      </p>
      <Link className="primary" href="/workspace">
        Open your workspace →
      </Link>
    </main>
  );
}
