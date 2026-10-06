import "react-native-url-polyfill/auto";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { randomUUID } from "expo-crypto";
import {
  createClient,
  listOrgs,
  loadFleet,
  listFlightSummaries,
  savePreflight,
  requestPasswordReset,
  errorMessage,
  googleSignInEnabled,
  beginGoogleSignIn,
  type FleetBattery,
  type FleetDrone,
  type FlightSummary,
  type Org,
  type Preflight,
} from "@logskies/api";
import { parseBatteryQr } from "@logskies/domain";
// Development-only browser fixtures. Never authenticate or call Supabase in this preview.
const preview =
  __DEV__ &&
  Platform.OS === "web" &&
  process.env.EXPO_PUBLIC_UI_PREVIEW === "1";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL,
  key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const connectedClient =
  !preview && url && key
    ? createClient(url, key, {
        auth: {
          storage: AsyncStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: "pkce",
        },
      })
    : null;
const demoOrg: Org = {
  id: "ui-preview",
  name: "Example Flight Team",
  logo_storage_path: null,
};
let googleExchange: { code: string; promise: Promise<void> } | null = null;
async function completeGoogleSignIn(code: string) {
  if (!connectedClient)
    throw new Error("The shared account is not configured.");
  if (!code || code.length > 2048)
    throw new Error("Invalid Google sign-in callback.");
  if (googleExchange?.code === code) return googleExchange.promise;
  const promise = (async () => {
    const { error } = await connectedClient.auth.exchangeCodeForSession(code);
    if (error) throw error;
  })();
  googleExchange = { code, promise };
  return promise;
}
const demoDrones: FleetDrone[] = [
  {
    id: "demo-drone-1",
    org_id: demoOrg.id,
    model_name: "Agriculture drone",
    uin_number: "EXAMPLE-UIN-01",
  },
  {
    id: "demo-drone-2",
    org_id: demoOrg.id,
    model_name: "Survey drone",
    uin_number: null,
  },
];
const demoBatteries: FleetBattery[] = [
  {
    id: "demo-battery-1",
    org_id: demoOrg.id,
    asset_tag: "BATT-AG-001",
    capacity_mah: 16000,
    chemistry: "LiPo",
    cell_count: 6,
  },
  {
    id: "demo-battery-2",
    org_id: demoOrg.id,
    asset_tag: "BATT-AG-002",
    capacity_mah: 16000,
    chemistry: "LiPo",
    cell_count: 6,
  },
  {
    id: "demo-battery-3",
    org_id: demoOrg.id,
    asset_tag: "BATT-SV-003",
    capacity_mah: 8000,
    chemistry: "Li-Ion",
    cell_count: 6,
  },
];
const demoFlights: FlightSummary[] = [
  {
    id: "demo-flight",
    drone_id: demoDrones[0].id,
    battery_id: demoBatteries[0].id,
    created_at: "2026-10-05T04:30:00Z",
    filename: "EXAMPLE — agriculture-flight.bin",
    format: "DataFlash",
    purpose: "agriculture_spraying",
    duration: 24,
    start_utc: "2026-10-05T04:00:00Z",
    occurrence_type: "unknown",
    airspace_checked_utc: null,
  },
];
function useWorkspaceState() {
  const client = connectedClient;
  const [ready, setReady] = useState(preview || !client),
    [userId, setUserId] = useState<string | null>(
      preview ? "preview-user" : null,
    );
  const [orgs, setOrgs] = useState<Org[]>(preview ? [demoOrg] : []),
    [orgId, setOrgId] = useState(preview ? demoOrg.id : "");
  const [batteries, setBatteries] = useState<FleetBattery[]>(
      preview ? demoBatteries : [],
    ),
    [drones, setDrones] = useState<FleetDrone[]>(preview ? demoDrones : []);
  const [flights, setFlights] = useState<FlightSummary[]>(
      preview ? demoFlights : [],
    ),
    [sessions, setSessions] = useState<Preflight[]>([]);
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [isError, setIsError] = useState(false);
  const [authGeneration, setAuthGeneration] = useState(0),
    epoch = useRef(0),
    lock = useRef(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    if (!preview && url && key)
      googleSignInEnabled(url, key)
        .then((value) => {
          if (active) setGoogleAvailable(value);
        })
        .catch(() => {
          if (active) setGoogleAvailable(false);
        });
    return () => {
      active = false;
    };
  }, []);
  const [batteryId, setBatteryId] = useState(""),
    [droneId, setDroneId] = useState(""),
    [scannedAt, setScannedAt] = useState("");
  const eventId = useRef<string | null>(null),
    [savedSession, setSavedSession] = useState(false);
  const [preflightRevision, setPreflightRevision] = useState(0);
  const resetPreflight = useCallback(() => {
    setPreflightRevision((value) => value + 1);
    setBatteryId("");
    setDroneId("");
    setScannedAt("");
    eventId.current = null;
    setSavedSession(false);
  }, []);
  const clearPrivate = useCallback(() => {
    setOrgs([]);
    setOrgId("");
    setBatteries([]);
    setDrones([]);
    setFlights([]);
    setSessions([]);
    resetPreflight();
    setMessage("");
    setLoading(false);
  }, [resetPreflight]);
  useEffect(() => {
    if (!client) return;
    let active = true,
      authChanged = false;
    client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || authChanged) return;
        setUserId(data.session?.user.id ?? null);
        setLoading(!!data.session);
        setReady(true);
        if (error) {
          setMessage(error.message);
          setIsError(true);
        }
      })
      .catch((e) => {
        if (active) {
          setMessage(errorMessage(e));
          setIsError(true);
          setReady(true);
        }
      });
    const auth = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      authChanged = true;
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        epoch.current++;
        clearPrivate();
        setLoading(!!session);
        setAuthGeneration((v) => v + 1);
      }
      setUserId(session?.user.id ?? null);
      setReady(true);
    });
    if (AppState.currentState === "active") client.auth.startAutoRefresh();
    const subscription = AppState.addEventListener("change", (state) =>
      state === "active"
        ? client.auth.startAutoRefresh()
        : client.auth.stopAutoRefresh(),
    );
    return () => {
      active = false;
      auth.data.subscription.unsubscribe();
      subscription.remove();
      client.auth.stopAutoRefresh();
    };
  }, [client, clearPrivate]);
  useEffect(() => {
    if (!client || !userId) return;
    let cancelled = false;
    listOrgs(client)
      .then((items) => {
        if (!cancelled) {
          setOrgs(items);
          setOrgId(items[0]?.id ?? "");
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setMessage(errorMessage(e));
          setIsError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [client, userId, authGeneration]);
  const refresh = useCallback(async () => {
    if (!client || !orgId || !userId) return;
    const current = epoch.current;
    setLoading(true);
    try {
      const [fleet, imported] = await Promise.all([
        loadFleet(client, orgId),
        listFlightSummaries(client, orgId),
      ]);
      if (current !== epoch.current) return;
      setBatteries(fleet.batteries);
      setDrones(fleet.drones);
      setSessions(fleet.sessions);
      setFlights(imported);
    } finally {
      if (current === epoch.current) setLoading(false);
    }
  }, [client, orgId, userId]);
  useEffect(() => {
    const current = epoch.current;
    void Promise.resolve()
      .then(refresh)
      .catch((e) => {
        if (current === epoch.current) {
          setMessage(errorMessage(e));
          setIsError(true);
        }
      });
  }, [refresh]);
  async function run(action: () => Promise<void>) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setMessage("");
    setIsError(false);
    const current = epoch.current;
    try {
      await action();
      return true;
    } catch (e) {
      if (current === epoch.current) {
        setMessage(errorMessage(e));
        setIsError(true);
      }
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function selectOrg(id: string) {
    if (busy || id === orgId || !orgs.some((o) => o.id === id)) return;
    epoch.current++;
    setOrgId(id);
    setBatteries([]);
    setDrones([]);
    setFlights([]);
    setSessions([]);
    resetPreflight();
    setMessage("");
  }
  function selectBattery(id: string) {
    if (lock.current) return false;
    if (!batteries.some((b) => b.id === id)) return false;
    setBatteryId(id);
    setScannedAt(new Date().toISOString());
    eventId.current = randomUUID();
    setSavedSession(false);
    return true;
  }
  function choosePayload(payload: string) {
    const id =
      parseBatteryQr(payload) ??
      batteries.find(
        (b) => b.asset_tag.toLowerCase() === payload.trim().toLowerCase(),
      )?.id;
    if (id && selectBattery(id)) {
      setMessage("");
      return true;
    }
    setMessage(
      "Battery not found in this organization. Choose it from your fleet or check its QR label.",
    );
    setIsError(true);
    return false;
  }
  async function recordPreflight() {
    if (
      !orgId ||
      !batteryId ||
      !droneId ||
      !scannedAt ||
      !eventId.current ||
      savedSession
    )
      return false;
    const record: Preflight = {
      id: eventId.current,
      battery_id: batteryId,
      drone_id: droneId,
      scanned_at: scannedAt,
    };
    const current = epoch.current;
    return run(async () => {
      if (!preview) {
        if (!client)
          throw new Error("Sign in before saving a preflight session.");
        await savePreflight(client, {
          orgId,
          batteryId,
          droneId,
          eventId: record.id,
          scannedAt,
        });
      }
      if (current !== epoch.current) return;
      // A failed history refresh must not turn a successful write into a failed save.
      setSessions((items) => [record, ...items]);
      setSavedSession(true);
      setMessage(
        preview
          ? "Example session saved in memory only."
          : "Preflight session saved online.",
      );
    });
  }
  const openWeb = (path = "/workspace") =>
    run(async () => {
      await Linking.openURL(`https://logskies.com${path}`);
    });
  return {
    ready,
    userId,
    orgs,
    orgId,
    org: orgs.find((o) => o.id === orgId),
    batteries,
    drones,
    flights,
    sessions,
    loading,
    busy,
    message,
    isError,
    preview,
    configured: !!client || preview,
    googleAvailable,
    completeGoogleSignIn,
    signInGoogle: () =>
      run(async () => {
        if (!client || !googleAvailable)
          throw new Error(
            "Google sign-in setup is still pending. Use email for now.",
          );
        const redirect = "logskies://auth/callback";
        const loginUrl = await beginGoogleSignIn(client, redirect, true);
        const result = await WebBrowser.openAuthSessionAsync(
          loginUrl,
          redirect,
        );
        if (result.type !== "success")
          throw new Error("Google sign-in was cancelled. You can try again.");
        const returned = new URL(result.url);
        if (
          returned.protocol !== "logskies:" ||
          returned.hostname !== "auth" ||
          returned.pathname !== "/callback"
        )
          throw new Error("Unexpected sign-in callback.");
        if (returned.searchParams.get("error"))
          throw new Error("Google sign-in was not completed.");
        const code = returned.searchParams.get("code");
        if (!code)
          throw new Error(
            "Google sign-in did not return an authorization code.",
          );
        await completeGoogleSignIn(code);
      }),
    batteryId,
    droneId,
    scannedAt,
    savedSession,
    preflightRevision,
    selectBattery,
    selectDrone: (id: string) => {
      if (lock.current) return;
      if (drones.some((d) => d.id === id)) {
        setDroneId(id);
        setSavedSession(false);
      }
    },
    choosePayload,
    resetPreflight,
    recordPreflight,
    selectOrg,
    reloadOrgs: async () => {
      if (!client) return;
      const current = epoch.current;
      const items = await listOrgs(client);
      if (current === epoch.current) setOrgs(items);
    },
    refresh: () => run(refresh),
    run,
    openWeb,
    clearMessage: () => setMessage(""),
    signIn: (email: string, password: string) =>
      run(async () => {
        if (!client) throw new Error("The shared workspace is not configured.");
        const { error } = await client.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }),
    resetPassword: (email: string) =>
      run(async () => {
        if (!client) throw new Error("The shared workspace is not configured.");
        await requestPasswordReset(
          client,
          email,
          "https://logskies.com/workspace",
        );
        setMessage(
          "If an account exists, a reset link will be emailed. Choose your password in the browser, then return here.",
        );
      }),
    signOut: () =>
      run(async () => {
        if (preview) {
          epoch.current++;
          clearPrivate();
          setUserId(null);
        } else if (client) {
          const { error } = await client.auth.signOut();
          if (error) throw error;
        }
      }),
  };
}
type Workspace = ReturnType<typeof useWorkspaceState>;
const Context = createContext<Workspace | null>(null);
export function WorkspaceProvider({ children }: PropsWithChildren) {
  const value = useWorkspaceState();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useWorkspace() {
  const value = useContext(Context);
  if (!value) throw new Error("WorkspaceProvider is required.");
  return value;
}
