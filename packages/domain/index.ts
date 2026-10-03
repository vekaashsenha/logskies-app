export type Battery = {
  id: string;
  tag: string;
  chemistry: string;
  capacityMah: number;
  cycles: number;
  health: number | null;
};
export type Drone = { id: string; name: string; uin: string };
export type Session = {
  id: string;
  batteryId: string;
  droneId: string;
  scannedAt: string;
};
export const sampleBatteries: Battery[] = [
  {
    id: "demo-battery-01",
    tag: "BATT-AG-001",
    chemistry: "LiPo 6S",
    capacityMah: 16000,
    cycles: 42,
    health: null,
  },
  {
    id: "demo-battery-02",
    tag: "BATT-AG-002",
    chemistry: "LiPo 6S",
    capacityMah: 22000,
    cycles: 86,
    health: null,
  },
];
export const sampleDrones: Drone[] = [
  {
    id: "demo-drone-01",
    name: "Agriculture fleet / Drone 01",
    uin: "Demo UIN — unverified",
  },
];
export function batteryStatus(health: number | null) {
  if (health === null || !Number.isFinite(health) || health < 0 || health > 100)
    return "Unassessed";
  return health >= 85
    ? "Healthy estimate"
    : health >= 70
      ? "Ground check"
      : "Ground pack recommendation";
}
export function matchSession(
  sessions: Session[],
  droneId: string,
  flightStart: string,
): Session | null {
  const start = Date.parse(flightStart);
  const candidates = sessions.filter((s) => {
    const delta = start - Date.parse(s.scannedAt);
    return s.droneId === droneId && delta >= 0 && delta < 30 * 60 * 1000;
  });
  return candidates.length === 1 ? candidates[0] : null;
}
export function calculateHealth(scores: {
  capacity: number | null;
  sag: number | null;
  cycles: number | null;
}): number | null {
  const { capacity, sag, cycles } = scores;
  if (
    [capacity, sag, cycles].some(
      (s) => s === null || !Number.isFinite(s) || s < 0 || s > 100,
    )
  )
    return null;
  return (
    Math.round((0.4 * capacity! + 0.35 * sag! + 0.25 * cycles!) * 100) / 100
  );
}
export function parseBatteryQr(value: string): string | null {
  const prefix = "logskies:battery:";
  if (!value.startsWith(prefix)) return null;
  const id = value.slice(prefix.length);
  return /^[a-zA-Z0-9-]{1,80}$/.test(id) ? id : null;
}
export function csvCell(value: string): string {
  // Neutralize formula injection before escaping CSV delimiters.
  const safe = /^[=+@\-\t\r\n]/.test(value) ? "'" + value : value;
  return '"' + safe.replaceAll('"', '""') + '"';
}
