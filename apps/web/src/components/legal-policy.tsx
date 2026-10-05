const operator = "Kalka Traders, trading as LogSkies";
export default function LegalPolicy({ kind }: { kind: "terms" | "privacy" }) {
  const sections =
    kind === "terms"
      ? [
          [
            "Using LogSkies",
            "These terms cover the LogSkies website, connected workspace and Android app. The service is for adult commercial users aged 18 or older. If you act for an organization, you must be authorized to do so. Read these terms and the Privacy Policy before creating an account.",
          ],
          [
            "Early-access service",
            "LogSkies provides fleet inventory, battery identification, preflight associations, supported flight-log imports and Flight Operations Reports. This release is online-only. Web and Android share organization records; detailed log import and evidence review are web workflows. Features and supported formats may change. We will provide appropriate notice of material changes.",
          ],
          [
            "Your account and records",
            "Keep credentials private, provide accurate information and use organization access only for authorized work. You retain ownership of your logs and branding and authorize processing necessary to provide the service. Upload only data you have permission to use. Do not falsify records, bypass access controls, upload malicious files or use the service unlawfully. We may restrict access where reasonably necessary for security, misuse investigation or legal obligations, with notice where practicable.",
          ],
          [
            "Flight safety and report limitations",
            "You remain responsible for aircraft registration, pilot qualifications, operational permissions, battery inspection and safe flight. A preflight association does not confirm takeoff. Parsed arming intervals may differ from actual flight boundaries. Battery estimates support review and do not certify airworthiness. Review source logs and missing evidence before relying on outputs. LogSkies is independent of DGCA/eGCA; reports are not DGCA-approved forms and do not guarantee audit acceptance or grant airspace permission.",
          ],
          [
            "Fees",
            "Payments and recurring subscriptions are not active in this release. Early access is not a promise of permanent free service. Future paid plans will disclose prices, taxes, limits, renewal, cancellation and refund terms before purchase. These terms do not create a paid subscription.",
          ],
          [
            "Availability and ending use",
            "Service interruptions may occur. Preserve original logs independently and export important records. Clearing browser data removes local demo records, not hosted organization records. Stop using LogSkies or contact support to request account deletion. Organization-owned operational records may need an authorized organization's decision or lawful retention; we will explain applicable restrictions.",
          ],
          [
            "Liability and disputes",
            "To the extent permitted by law, we do not warrant uninterrupted availability, completeness of telemetry or regulatory acceptance of reports. Operational decisions remain the operator's responsibility. Nothing excludes liability that cannot legally be excluded or removes non-waivable statutory rights. Indian law applies, subject to mandatory rights and applicable dispute forums. Contact support first so we can investigate concerns.",
          ],
        ]
      : [
          [
            "Information we process",
            "Account data includes email, authentication identifiers and sessions. Fleet records include organization names/logos, membership roles, drones/UINs, battery tags/specifications and preflight associations. Shared pilot profiles contain names, RPC numbers and expiry dates supplied by organization owners or admins and visible to authorized members. Uploaded logs, including PX4 ULog originals, can contain precise coordinates, timestamps, identifiers and diagnostic telemetry. Reviews and private supporting files may contain pilot/RPC details, permissions, incident locations, injury/damage descriptions, authority notification receipts and reviewer names. Avoid unnecessary third-party personal or medical details. Upload only information necessary for your operations. Saving an occurrence does not notify authorities. Support email processes messages and attachments you send.",
          ],
          [
            "How we use information",
            "We use information to authenticate users, control organization access, synchronize records, visualize recorded flight paths and telemetry, prepare reports, send confirmation/recovery emails, handle support/privacy requests and investigate security incidents. The flight coordinate map renders locally without sending route coordinates to an external map provider. We do not sell uploaded flight logs or use them for advertising. Our current application code does not operate advertising tracking. Providers may process IP addresses, device/browser information and security logs.",
          ],
          [
            "Access and service providers",
            "Authorized organization members can access records according to their role. Supabase provides authentication, database and private file storage; the current project is hosted in Tokyo, Japan. Cloudflare hosts the website, handles DNS and forwards support email. Resend delivers authentication emails. Expo provides Android build/distribution infrastructure. Providers may process information outside India. We may disclose information where legally required, with safeguards and notice where permitted. You control sharing of downloaded reports and originals.",
          ],
          [
            "Device permissions and local data",
            "Android camera access scans battery QR labels. The current QR workflow does not upload camera images or record audio; manual battery selection is available. Revoke camera permission in Android settings if desired. Flight coordinates come from uploaded telemetry; the app does not request continuous background phone location. Web and Android store authentication/session information locally. The demo stores records in browser local storage/IndexedDB and does not sync them. Clearing local data may remove demo records. Signing out is not deletion of hosted records.",
          ],
          [
            "Retention and deletion requests",
            "Hosted records do not currently have an automatic expiry and remain until removed through an authorized process or retained for an applicable legal obligation. Contact support to request access, correction, export or account deletion, or to raise a privacy concern. Requests are handled manually and identity may need verification. Organization-owned operational records may require the organization's authorization. We will explain any retained records and applicable backup limitations; no fixed backup-purge period is currently promised. Keep independent copies of required operational records.",
          ],
          [
            "Security and your choices",
            "Organization membership policies and private storage restrict access. No internet service can guarantee absolute security. Protect your email, device and exported records. Never send passwords or password-reset links to support. You may stop using the service or request deletion. The service is intended for adults, not children. We will date policy revisions and provide appropriate notice of material changes.",
          ],
        ];
  return (
    <section className="public-section public-container guide-article">
      <p>Effective: 5 October 2026 · Early-access service</p>
      <h2>Operator and contact</h2>
      <p>
        {operator}. First Floor, 3012, Green Field Colony, Faridabad, Haryana
        121010, India.
      </p>
      <p>
        Support and privacy/grievance contact: Kritika, Founder ·{" "}
        <a href="mailto:support@logskies.com">support@logskies.com</a>.
      </p>
      {sections.map(([heading, body]) => (
        <section key={heading}>
          <h2>{heading}</h2>
          <p>{body}</p>
        </section>
      ))}
    </section>
  );
}
