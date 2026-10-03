import { parseLog } from "@logskies/telemetry";
import { checkRoute, type ZoneDataset } from "@logskies/telemetry/airspace";
import type { Point } from "@logskies/telemetry";
self.onmessage = (
  event: MessageEvent<{
    buffer: ArrayBuffer;
    filename: string;
    systemId?: number;
    kind?: string;
    route?: Point[];
    dataset?: ZoneDataset;
  }>,
) => {
  try {
    if (
      event.data.kind === "airspace" &&
      event.data.route &&
      event.data.dataset
    ) {
      self.postMessage({
        result: checkRoute(event.data.route, event.data.dataset),
      });
      return;
    }
    const result = parseLog(
      event.data.buffer,
      event.data.filename,
      event.data.systemId,
    );
    self.postMessage({ result });
  } catch (error) {
    self.postMessage({
      error: error instanceof Error ? error.message : "Log parsing failed.",
    });
  }
};
