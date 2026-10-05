# PX4 ULog import

Browser-local shared TypeScript decoder based on the [official ULog specification](https://docs.px4.io/main/en/dev_log/ulog_file_format). No Python server or external log upload is required. pyulog is used only as an independent development reference.

Supported summaries: vehicle_global_position or fallback vehicle_gps_position/sensor_gps (instance 0), battery_status (separate subscription multi IDs), and actuator_armed (instance 0). GPS integer degrees/metres are scaled; modern latitude_deg/longitude_deg/altitude_msl_m supported. GPS UTC anchors must be consistent. Relative elevation is not terrain AGL. Arming intervals require prior observed disarming for complete-boundary evidence; they remain proxies.

Header/magic, format lengths, trailing padding, subscriptions, per-topic monotonic clocks and incompatible flags are validated. Appended crash data and unknown incompatibility flags are rejected for specialist review. Truncation/dropouts produce warnings and incomplete boundaries. Pre-recording/stale timestamps cannot inflate the log window. Missing GPS/battery/UTC remain unavailable. Other diagnostic topics are retained in the original, not interpreted as a forensic finding.

## Public independent sample

- Source: https://github.com/PX4/pyulog/blob/main/test/sample.ulg (downloaded 5 October 2026).
- Retained test fixture: docs/fixtures/px4-pyulog-sample.ulg. BSD-3-Clause notice: PX4-pyulog-LICENSE.md.
- SHA-256: 81952e6059bc095717e7911c010e07f85749d6b04d332a5ffc51575a3fd0a558.
- Independent pyulog 1.2.4: 64,542 dataset messages, recording start 112,500,176 us, last timestamp 181,493,506 us; four dropouts (0/26/31/62 ms).
- LogSkies matches count/bounds; recording window about 68.99333 seconds. No GPS, battery or UTC topics establishing a flight. Unknown telemetry remains visible rather than a healthy score or fabricated path.
- Synthetic binary tests separately exercise position, UTC, battery and arming decoding, omitted trailing padding, missing current/capacity, rollback, truncation and incompatibility rejection. Synthetic test coverage does not validate a customer aircraft.

Real complete PX4 flights with operator ground truth remain required. Developer CLI option: `pip install pyulog`, then `ulog2csv sample.ulg`; this generates per-topic CSV files, not a DGCA report.
