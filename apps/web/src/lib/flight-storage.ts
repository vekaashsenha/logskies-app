import type { ParsedFlight } from "@logskies/telemetry";
import type { HealthInputs } from "@logskies/telemetry/health";
import type { Review } from "@logskies/telemetry/compliance";
import type { ZoneDataset, AirspaceResult } from "@logskies/telemetry/airspace";
export type FlightRecord = {
  airspace?: {
    dataset: ZoneDataset;
    result: AirspaceResult;
    sourceHash: string;
  };
  id: string;
  filename: string;
  sourceHash: string;
  sourceBytes: number;
  importedAt: string;
  parserVersion: string;
  format: string;
  systemId: number | null;
  flight: ParsedFlight;
  batteryId: string;
  droneId: string;
  matchMethod: string;
  healthInputs: HealthInputs;
  review: Review;
};
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("logskies-flight-records", 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("records", { keyPath: "id" });
      request.result.createObjectStore("sources", { keyPath: "hash" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("Browser flight storage is unavailable."));
  });
}
export async function listFlights(): Promise<FlightRecord[]> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("records", "readonly");
      const request = tx.objectStore("records").getAll();
      tx.oncomplete = () =>
        resolve(
          (request.result as FlightRecord[]).sort((a, b) =>
            b.importedAt.localeCompare(a.importedAt),
          ),
        );
      tx.onerror = () =>
        reject(new Error("Unable to read saved flight records."));
    });
  } finally {
    db.close();
  }
}
export async function saveFlights(
  records: FlightRecord[],
  source?: { hash: string; buffer: ArrayBuffer; filename: string },
) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["records", "sources"], "readwrite");
      for (const record of records) tx.objectStore("records").put(record);
      if (source) tx.objectStore("sources").put(source);
      tx.oncomplete = () => resolve();
      tx.onerror = () =>
        reject(
          new Error(
            "Unable to save flight data. Check available browser storage.",
          ),
        );
      tx.onabort = () =>
        reject(new Error("Flight save aborted; no success was recorded."));
    });
  } finally {
    db.close();
  }
}
export async function readSource(
  hash: string,
): Promise<{ buffer: ArrayBuffer; filename: string }> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("sources", "readonly");
      const request = tx.objectStore("sources").get(hash);
      tx.oncomplete = () =>
        request.result
          ? resolve(request.result)
          : reject(new Error("Original log not found in this browser."));
      tx.onerror = () => reject(new Error("Unable to read original log."));
    });
  } finally {
    db.close();
  }
}
