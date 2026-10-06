import Link from "next/link";
import Image from "next/image";
export function PageIntro({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="page-intro">
      <div className="public-container">
        <p className="hero-eyebrow">{label}</p>
        <h1>{title}</h1>
        <p className="intro-description">{description}</p>
        {children}
      </div>
    </section>
  );
}
export function CallToAction() {
  return (
    <section className="public-cta">
      <div className="public-container cta-content">
        <div>
          <p className="hero-eyebrow">YOUR NEXT MISSION STARTS HERE</p>
          <h2>Bring your fleet records together.</h2>
          <p>
            Explore the workflow, from a physical battery to a branded report.
          </p>
        </div>
        <div className="cta-buttons">
          <Link href="/workspace" className="button-white">
            Open your workspace →
          </Link>
          <Link href="/faq" className="button-outline-light">
            Help & FAQ
          </Link>
        </div>
      </div>
    </section>
  );
}
export function IndustryArt({ kind }: { kind: number }) {
  const names = [
    "agriculture",
    "survey",
    "mining",
    "training",
    "inspection",
    "delivery",
  ];
  return (
    <Image
      src={`/images/industries/${names[kind]}.png`}
      alt={
        [
          "Agricultural spray drone above a green rice field",
          "Mapping drone surveying rural parcels",
          "Survey drone over an open pit quarry",
          "Drone pilots at an outdoor training field",
          "Drone inspecting powerline infrastructure",
          "Cargo drone above rural countryside",
        ][kind]
      }
      width={1536}
      height={1024}
      className="industry-art"
      sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 600px"
    />
  );
}
export const industries = [
  {
    title: "Agriculture & spraying",
    description:
      "Keep physical battery identities and preflight records organized across field teams and repeated spraying missions.",
    kind: 0,
    points: [
      "QR identification in the field",
      "Battery-to-drone associations",
      "A shared record of each preflight",
    ],
  },
  {
    title: "Surveying & mapping",
    description:
      "Bring the fleet context behind every survey into one workspace, ready for flight review and report preparation.",
    kind: 1,
    points: [
      "Drone and battery inventory",
      "Clear mission associations",
      "Company-branded record packs",
    ],
  },
  {
    title: "Mining & earthworks",
    description:
      "Give site operators a consistent way to track their equipment and prepare the evidence behind operational records.",
    kind: 2,
    points: [
      "Organization-based fleet access",
      "Physical asset identifiers",
      "Consistent reporting workflow",
    ],
  },
  {
    title: "Training operations",
    description:
      "Organize equipment selection, preflight capture and record review for training flights. Dedicated RPTO student records and instructor approvals are not included in this release.",
    kind: 3,
    points: [
      "Registered drones and packs",
      "Structured preflight sessions",
      "Accessible web and Android workflow",
    ],
  },
  {
    title: "Powerline inspection",
    description:
      "Keep pack identities, equipment records and mission evidence together for teams inspecting powerline corridors and utility assets.",
    kind: 4,
    points: [
      "A shared fleet workspace",
      "Pack identification before flight",
      "Reviewable operation history",
    ],
  },
  {
    title: "Delivery & BVLOS",
    description:
      "Bring cargo missions, equipment identities and permission evidence into a reviewable record. BVLOS operations need their own applicable authorization.",
    kind: 5,
    points: [
      "Route and permission evidence planning",
      "Web administration and field scanning",
      "Your company identity on reports",
    ],
  },
];
