# Regulatory evidence review — 5 October 2026

The Flight Operations Report remains an operator-reviewed draft. No DGCA approval, audit-proof status, eGCA ingestion, live DigitalSky feed or automatic authority notification is claimed.

## Implemented

- Dated preflight map/source evidence, full intended-route/vertical-limit confirmation and temporary-restriction confirmation. Checks require the recorded check to precede the entered takeoff time. Missing fields on old records remain pending; re-review them.
- General green-zone 120 m and operational-airport 8–12 km band 60 m contexts. An inconsistent selected ceiling fails. Restricted/permission-specific ceilings remain pending for manual review rather than applying a universal 120 m limit.
- Yellow permission authority must be ATC; red must be Central Government. References and attachments are operator evidence, not authenticated permission.
- Explicit occurrence declaration, awareness UTC, known location/injury/damage/payload details and AAIB/DGCA notification times/references. For Indian accidents/serious incidents, District Magistrate and police information references are recorded. The 24-hour outer deadline is calculated from awareness; late entered notifications fail the evidence check. A timely entry does not establish that notice was given as soon as reasonably practicable or accepted.
- Drone Rules Rule 30 accident submission reference retained separately. The older rule states 48 hours from accident occurrence; it is not presented as the sole deadline.
- Up to ten genuine PDF/PNG/JPEG supporting files, each <=5 MB, fingerprinted and stored in existing private flight-logs storage. Review and attachment metadata save together via the existing owner/admin RPC; members retain existing read access. The files are downloadable, with hashes in CSV/JSON/print reports. No extra public bucket or access grants.
- Native summaries show source format, occurrence declaration and airspace-check time; the existing web-report link opens the complete workflow. Native import/editing is not added. Installed APKs need a new build.

## Primary sources and boundaries

- [Drone Rules 2021](https://digitalsky.aai.aero/pdf/Drone_rule_2021.pdf): Rule 3 zone definitions; Rules 20–24 maps/preflight checks/permissions/dynamic zoning/temporary red zones; Rule 30 accidents.
- [2022 amendment](https://digitalsky.aai.aero/pdf/Drone_Rules_2022.pdf): RPC terminology.
- [DigitalSky FAQ](https://digitalsky.aai.aero/faq): ACT is an authority zone-creation tool, not a pilot flight-planning tool; approved zones and validity periods. Use the notified map and rules when FAQ descriptions are simplified.
- [2025 investigation rules](https://www.civilaviation.gov.in/sites/default/files/2026-05/aaib-rules-2025.pdf): Rule 4 notice as soon as reasonably practicable, at most 24 hours after awareness, to AAIB/DGCA; local authority information for Indian accidents/serious incidents. Rule 2 accident definition includes a State design/operational approval qualification for unmanned aircraft. Rule 7 protects RPAS evidence including station/C2-related recordings. Applicability and official classification require operator/authority review; app classification is not final.
- A July 2026 amendment was located in secondary indexing, describing clarification of supersession of 2017 rules. Its primary PDF was unavailable during this review. Obtain it and complete a legal review before claiming this is an exhaustive current statutory inventory.
- UTM framework describes approved UTMSPs and possible SSP API access; LogSkies is not thereby an approved UTMSP. No automatic approval integration was attempted.
- Certification Scheme 232917, page 166, section 10.3 calls for operations/maintenance log provisions reviewed by the certification body. This does not prescribe one universally approved third-party CSV/PDF.
- 230076 is a manufacturer PLI scheme; doc202212810701 is a PIB backgrounder.
- User-supplied Interactive-Maps-API-Swagger-Documentation-v1.0.yml is HTML, not an OpenAPI contract. Authoritative API access/documentation remains pending.

## Remaining validation

Real customer end-to-end flights and permission documents; actual operator report acceptance; authoritative airspace API access, time/height geometry and current restrictions; complete legal review; official notification channel verification. Evidence is editable by organization admins and is not a tamper-proof custody system. Do not wait for LogSkies exports to notify authorities. Preserve source files and independent copies.
