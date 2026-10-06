import { createClient, type SupabaseClient } from "@supabase/supabase-js";
export { createClient };
export type { SupabaseClient };
export async function googleSignInEnabled(
  url: string,
  publishableKey: string,
): Promise<boolean> {
  const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, {
    headers: { apikey: publishableKey },
  });
  if (!response.ok)
    throw new Error("Unable to check Google sign-in availability.");
  const settings = await response.json();
  return settings.external?.google === true;
}
export async function beginGoogleSignIn(
  client: SupabaseClient,
  redirectTo: string,
  skipBrowserRedirect = false,
) {
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
  if (!data.url) throw new Error("Google sign-in did not return a login URL.");
  return data.url;
}
export async function requestPasswordReset(
  client: SupabaseClient,
  email: string,
  redirectTo: string,
) {
  const address = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
    throw new Error("Enter a valid email address first.");
  const { error } = await client.auth.resetPasswordForEmail(address, {
    redirectTo,
  });
  if (error) throw error;
}
export type Org = {
  id: string;
  name: string;
  logo_storage_path: string | null;
};
export type PilotProfile = {
  id: string;
  org_id: string;
  display_name: string;
  rpc_number: string | null;
  rpc_expires_on: string | null;
};
export async function listPilots(
  client: SupabaseClient,
  orgId: string,
): Promise<PilotProfile[]> {
  const { data, error } = await client
    .from("pilot_profiles")
    .select("id,org_id,display_name,rpc_number,rpc_expires_on")
    .eq("org_id", orgId)
    .order("display_name");
  if (error) throw error;
  return data ?? [];
}
export async function savePilot(
  client: SupabaseClient,
  orgId: string,
  input: {
    id?: string;
    display_name: string;
    rpc_number: string;
    rpc_expires_on: string;
  },
) {
  const name = input.display_name.trim(),
    rpc = input.rpc_number.trim(),
    expiry = input.rpc_expires_on.trim();
  if (!name || name.length > 120)
    throw new Error("Enter a pilot name of 1–120 characters.");
  if (rpc.length > 120)
    throw new Error("RPC number must be at most 120 characters.");
  if (
    expiry &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(expiry) ||
      !Number.isFinite(Date.parse(expiry)) ||
      new Date(expiry).toISOString().slice(0, 10) !== expiry)
  )
    throw new Error("Enter a valid expiry date as YYYY-MM-DD.");
  const values = {
    display_name: name,
    rpc_number: rpc || null,
    rpc_expires_on: expiry || null,
  };
  if (!input.id && (await listPilots(client, orgId)).length >= 5)
    throw new Error(
      "A company can have a maximum of five pilot profiles. Edit an existing profile.",
    );
  const query = input.id
    ? client
        .from("pilot_profiles")
        .update(values)
        .eq("org_id", orgId)
        .eq("id", input.id)
    : client.from("pilot_profiles").insert({ ...values, org_id: orgId });
  const { data, error } = await query.select("id").single();
  if (error) throw error;
  return data.id as string;
}
export async function renameOrg(
  client: SupabaseClient,
  orgId: string,
  name: string,
) {
  const value = name.trim();
  if (!value || value.length > 120)
    throw new Error("Enter a company name of 1–120 characters.");
  const { error } = await client
    .from("organizations")
    .update({ name: value })
    .eq("id", orgId)
    .select("id")
    .single();
  if (error) throw error;
}
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
  if ((await listOrgs(client)).length > 0)
    throw new Error("Your company is already set up. Manage it in Profile.");
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
  chemistry = "LiPo",
  cellCount = 6,
) {
  if (
    !assetTag.trim() ||
    !Number.isInteger(capacityMah) ||
    capacityMah < 1 ||
    capacityMah > 1000000 ||
    !["LiPo", "Li-Ion", "LiFePO4"].includes(chemistry) ||
    !Number.isInteger(cellCount) ||
    cellCount < 1 ||
    cellCount > 32
  )
    throw new Error("Enter a battery tag and valid rated capacity.");
  const { error } = await client.from("batteries").insert({
    org_id: orgId,
    asset_tag: assetTag.trim(),
    capacity_mah: capacityMah,
    chemistry,
    cell_count: cellCount,
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
  const { error } = await client.from("drones").insert({
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
  const { error } = await client.from("preflight_sessions").insert({
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
export type FlightSummary = {
  format?: string;
  occurrence_type?: string | null;
  airspace_checked_utc?: string | null;
  id: string;
  drone_id: string;
  battery_id: string | null;
  created_at: string;
  filename: string;
  purpose: string;
  duration: number;
  start_utc: string | null;
};
export async function listFlightSummaries(
  client: SupabaseClient,
  orgId: string,
): Promise<FlightSummary[]> {
  const { data, error } = await client
    .from("flight_imports")
    .select(
      "id,drone_id,battery_id,created_at,filename:record->>filename,format:record->>format,occurrence_type:record->review->occurrence->>type,airspace_checked_utc:record->review->airspaceCheck->>checkedAtUtc,purpose:record->review->>purpose,duration:record->flight->durationMinutes,start_utc:record->flight->>startUtc",
    )
    .eq("org_id", orgId)
    .or(
      "record->>format.neq.MAVLink,record->>parserVersion.neq.logskies-browser-1.0",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as FlightSummary[];
}
