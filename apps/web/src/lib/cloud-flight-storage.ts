import type { SupabaseClient } from "@logskies/api";
import type { FlightRecord } from "./flight-storage";
import type { FlightStore } from "@/components/flight-workbench";

// Imported records are user-supplied evidence, never certified service results.
export function cloudFlightStore(
  client: SupabaseClient,
  orgId: string,
): FlightStore {
  const path = (hash: string) => `${orgId}/${hash}/source`;
  return {
    async listFlights() {
      const { data, error } = await client
        .from("flight_imports")
        .select("record")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false });
      if (error)
        throw new Error(`Flight history unavailable: ${error.message}`);
      return (data ?? []).map((row) => row.record as FlightRecord);
    },
    async saveFlights(records, source) {
      if (source) {
        const { error } = await client.storage
          .from("flight-logs")
          .upload(path(source.hash), source.buffer, {
            contentType: "application/octet-stream",
            upsert: false,
          });
        if (error && !["409", "Duplicate"].includes(String(error.statusCode)))
          throw error;
      }
      const { error } = await client.rpc("save_flight_imports", {
        target_org: orgId,
        records: records,
      });
      if (error) throw error;
    },
    async readSource(hash) {
      if (!/^[a-f0-9]{64}$/.test(hash))
        throw new Error("Invalid source fingerprint.");
      const { data, error } = await client.storage
        .from("flight-logs")
        .download(path(hash));
      if (error || !data) throw error ?? new Error("Original log unavailable.");
      const buffer = await data.arrayBuffer();
      const fingerprint = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", buffer)),
      )
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      if (fingerprint !== hash)
        throw new Error(
          "Original log fingerprint mismatch. Do not use this file as evidence.",
        );
      return { buffer, filename: `${hash}.source` };
    },
  };
}
