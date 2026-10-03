import { createClient, type SupabaseClient } from "@supabase/supabase-js";
export { createClient };
export type { SupabaseClient };
export type Org = {
  id: string;
  name: string;
  logo_storage_path: string | null;
};
export type FleetBattery = {
  id: string;
  org_id: string;
  asset_tag: string;
  chemistry: string;
  capacity_mah: number;
  cell_count: number;
};
export type FleetDrone = {
  id: string;
  org_id: string;
  model_name: string;
  uin_number: string | null;
};
export type Preflight = {
  id: string;
  battery_id: string;
  drone_id: string;
  scanned_at: string;
};
export async function listOrgs(client: SupabaseClient): Promise<Org[]> {
  const { data, error } = await client
    .from("organizations")
    .select("id,name,logo_storage_path")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}
export async function createOrg(
  client: SupabaseClient,
  name: string,
): Promise<string> {
  const { data, error } = await client.rpc("create_organization", {
    org_name: name,
  });
  if (error) throw error;
  return data;
}
export async function loadFleet(client: SupabaseClient, orgId: string) {
  const results = await Promise.all([
    client
      .from("batteries")
      .select("id,org_id,asset_tag,chemistry,capacity_mah,cell_count")
      .eq("org_id", orgId)
      .order("created_at"),
    client
      .from("drones")
      .select("id,org_id,model_name,uin_number")
      .eq("org_id", orgId)
      .order("created_at"),
    client
      .from("preflight_sessions")
      .select("id,battery_id,drone_id,scanned_at")
      .eq("org_id", orgId)
      .order("scanned_at", { ascending: false })
      .limit(100),
  ]);
  for (const result of results) if (result.error) throw result.error;
  return {
    batteries: (results[0].data ?? []) as FleetBattery[],
    drones: (results[1].data ?? []) as FleetDrone[],
    sessions: (results[2].data ?? []) as Preflight[],
  };
}
export async function addBattery(
  client: SupabaseClient,
  orgId: string,
  assetTag: string,
  capacityMah: number,
) {
  if (
    !assetTag.trim() ||
    !Number.isInteger(capacityMah) ||
    capacityMah < 1 ||
    capacityMah > 1000000
  )
    throw new Error("Enter a battery tag and valid rated capacity.");
  const { error } = await client
    .from("batteries")
    .insert({
      org_id: orgId,
      asset_tag: assetTag.trim(),
      capacity_mah: capacityMah,
      chemistry: "LiPo",
      cell_count: 6,
    });
  if (error) throw error;
}
export async function addDrone(
  client: SupabaseClient,
  orgId: string,
  name: string,
  uin: string,
) {
  if (!name.trim()) throw new Error("Enter a drone model/name.");
  const { error } = await client
    .from("drones")
    .insert({
      org_id: orgId,
      model_name: name.trim(),
      uin_number: uin.trim() || null,
    });
  if (error) throw error;
}
export async function savePreflight(
  client: SupabaseClient,
  input: {
    orgId: string;
    batteryId: string;
    droneId: string;
    eventId: string;
    scannedAt: string;
  },
) {
  const { error } = await client
    .from("preflight_sessions")
    .insert({
      org_id: input.orgId,
      battery_id: input.batteryId,
      drone_id: input.droneId,
      client_event_id: input.eventId,
      scanned_at: input.scannedAt,
    });
  if (error) throw error;
}
export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : "Operation failed. Please try again.";
}
