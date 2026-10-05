# Recorded flight-path replay — 5 October 2026

Web Flight logs now renders a local GPS coordinate map, first/last observed position markers, replay/pause and keyboard/scrub timeline. The selected marker is the last recorded position within five seconds, never an interpolated location. Battery channel readings and voltage chart cursor follow the same selected time. Gaps >5 seconds, missing voltage and clock rollback split line segments. Unknown readings remain unknown. Armed intervals are proxies; altitude is not certified AGL.

The local projection approximates short-range geometry, handles longitude wrap and stationary points. It has no satellite imagery, 3D terrain, authoritative zone overlay or external map provider; no route data is sent to a new third party. Printed Flight Operations Reports include static route/voltage views under the company header. Legacy MAVLink report/replay restrictions remain in force.

FAQ, features, telemetry guide and privacy copy updated together. Reviewed Android's existing Open web reports / workspace flow; it accesses replay through the deployed web workspace. No native replay API or APK change is introduced. Native app stays online-only with QR/preflight/shared summaries.

21 tests pass, covering gaps, stale/future positions, timestamp zero, orientation, stationary paths/date line, parser clocks and tenant isolation. Web lint/build and mobile type checks pass. Browser synthetic interval checked at 60s (GPS coordinate and 6000 mAh), playback reaches end, channel 1 switches to 48V/20A. Synthetic test data is not actual mission evidence. Real customer validation, actual PDF download/pagination and physical-device checks remain pending.
