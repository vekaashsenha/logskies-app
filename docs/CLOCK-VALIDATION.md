# Clock validation — 5 October 2026

Parser version logskies-browser-1.1 ties capture timestamps to the immediately following packet, instead of inspecting arbitrary preceding bytes. Selected-aircraft logs mixing capture UTC and boot clocks are rejected before producing import records. Capture-clock rollback is rejected. Valid boot zero remains valid; missing UTC remains a review warning. No universal 90-minute aircraft limit is imposed.

The user-supplied sample-trimmed.tlog now fails explicitly with PARSING_VALIDATION_ERROR instead of returning 25,562,288 minutes. The short .bin still remains an incomplete log window. Customer files remain outside the repository.

Legacy MAVLink 1.0 imports cannot render or export flight reports until re-imported. Shared mobile summaries exclude those legacy imports. Original evidence remains available; existing database records are not deleted. Installed APKs need a new build for the summary filter; Android report links use the updated web report.

Regression tests cover mixed clocks, boot timestamp zero, valid captured logs and existing CRC/tenant isolation checks. Real flight validation and PDF/device checks remain pending.
