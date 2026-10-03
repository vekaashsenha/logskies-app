import type { BatterySample } from "./index.ts";
export const SCORING_VERSION = "weighted-lipo-estimate-1.0";
export type HealthInputs = {
  ratedMah: number;
  cycles: number;
  instance: number;
  baselineResistanceOhms: number | null;
  expectedDeliveredMah: number | null;
  capacityTestConfirmed: boolean;
  comparableConditionsConfirmed: boolean;
};
export type HealthResult = {
  health: number | null;
  capacityScore: number | null;
  sagScore: number | null;
  cycleScore: number | null;
  consumedMah: number | null;
  resistanceOhms: number | null;
  startVoltage: number | null;
  endVoltage: number | null;
  maxCurrent: number | null;
  maxCellDelta: number | null;
  burstCount: number;
  reasons: string[];
  version: string;
};
const bounded = (value: number) => Math.max(0, Math.min(100, value));
export function estimateHealth(
  allSamples: BatterySample[],
  inputs: HealthInputs,
): HealthResult {
  const samples = allSamples
    .filter((s) => s.instance === inputs.instance)
    .sort((a, b) => a.t - b.t);
  const voltages = samples.filter((s) => s.voltage !== null && s.voltage > 0);
  const currents = samples.filter((s) => s.current !== null && s.current >= 0);
  const capacity = samples.filter(
    (s) => s.consumed !== null && s.consumed >= 0,
  );
  const reasons: string[] = [];
  let consumed: number | null = null,
    reset = false;
  if (capacity.length >= 2) {
    reset = capacity.some(
      (s, i) => i > 0 && s.consumed! < capacity[i - 1].consumed! - 1,
    );
    if (!reset)
      consumed =
        capacity[capacity.length - 1].consumed! - capacity[0].consumed!;
    else
      reasons.push(
        "Consumed-capacity counter reset; delivered capacity is unknown.",
      );
  } else reasons.push("Insufficient consumed-capacity counter samples.");
  const resistance: number[] = [];
  const electrical = samples.filter(
    (s) => s.current !== null && s.voltage !== null,
  );
  for (let i = 1; i < electrical.length; i++) {
    const before = electrical[i - 1],
      after = electrical[i],
      dt = after.t - before.t;
    if (
      dt <= 0 ||
      dt > 2 ||
      before.current === null ||
      after.current === null ||
      before.voltage === null ||
      after.voltage === null
    )
      continue;
    const deltaI = after.current - before.current,
      deltaV = before.voltage - after.voltage;
    if (deltaI > (2 * inputs.ratedMah) / 1000 && deltaV > 0) {
      const ir = deltaV / deltaI;
      if (ir > 0 && ir < 1) resistance.push(ir);
    }
  }
  resistance.sort((a, b) => a - b);
  const ir =
    resistance.length >= 3
      ? resistance[Math.floor(resistance.length / 2)]
      : null;
  if (ir === null)
    reasons.push(
      "At least three qualified >2C current steps within two seconds are required for sag estimation.",
    );
  const ratedValid =
    Number.isInteger(inputs.ratedMah) &&
    inputs.ratedMah > 0 &&
    inputs.ratedMah <= 1000000;
  const capacityScore =
    ratedValid &&
    inputs.capacityTestConfirmed &&
    inputs.expectedDeliveredMah !== null &&
    Number.isFinite(inputs.expectedDeliveredMah) &&
    inputs.expectedDeliveredMah > 0 &&
    inputs.expectedDeliveredMah <= inputs.ratedMah &&
    consumed !== null
      ? bounded((consumed / inputs.expectedDeliveredMah) * 100)
      : null;
  if (capacityScore === null)
    reasons.push(
      "Capacity score requires a confirmed comparable start-to-cutoff discharge and its expected delivered mAh.",
    );
  const baseline = inputs.baselineResistanceOhms;
  const sagScore =
    ratedValid &&
    ir !== null &&
    baseline !== null &&
    Number.isFinite(baseline) &&
    baseline > 0 &&
    inputs.comparableConditionsConfirmed
      ? bounded(100 - Math.max(0, ir / baseline - 1 - 0.3) * 100)
      : null;
  if (sagScore === null)
    reasons.push(
      "Sag score requires a valid baseline and comparable state-of-charge and temperature conditions.",
    );
  const cycleScore =
    Number.isInteger(inputs.cycles) && inputs.cycles >= 0
      ? bounded(100 - (inputs.cycles / 200) * 30)
      : null;
  if (cycleScore === null)
    reasons.push("Cycle count must be a nonnegative integer.");
  const health =
    capacityScore !== null && sagScore !== null && cycleScore !== null
      ? Math.round(
          (0.4 * capacityScore + 0.35 * sagScore + 0.25 * cycleScore) * 100,
        ) / 100
      : null;
  const cellDeltas = samples
    .filter((s) => s.cells.length >= 2)
    .map((s) => Math.max(...s.cells) - Math.min(...s.cells));
  return {
    health,
    capacityScore,
    sagScore,
    cycleScore,
    consumedMah: consumed,
    resistanceOhms: ir,
    startVoltage: voltages[0]?.voltage ?? null,
    endVoltage: voltages[voltages.length - 1]?.voltage ?? null,
    maxCurrent: currents.length
      ? currents.reduce((max, s) => Math.max(max, s.current!), 0)
      : null,
    maxCellDelta: cellDeltas.length
      ? cellDeltas.reduce((a, b) => Math.max(a, b), 0)
      : null,
    burstCount: resistance.length,
    reasons,
    version: SCORING_VERSION,
  };
}
