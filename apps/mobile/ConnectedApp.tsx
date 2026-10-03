import "react-native-url-polyfill/auto";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import { randomUUID } from "expo-crypto";
import { StatusBar } from "expo-status-bar";
import {
  createClient,
  listOrgs,
  loadFleet,
  savePreflight,
  errorMessage,
  type Org,
  type FleetBattery,
  type FleetDrone,
  type Preflight,
} from "@logskies/api";
import { parseBatteryQr } from "@logskies/domain";
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const connectedClient =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: AsyncStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;
export default function ConnectedApp() {
  const client = connectedClient!;
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [batteries, setBatteries] = useState<FleetBattery[]>([]);
  const [drones, setDrones] = useState<FleetDrone[]>([]);
  const [sessions, setSessions] = useState<Preflight[]>([]);
  const [batteryId, setBatteryId] = useState("");
  const [droneId, setDroneId] = useState("");
  const [manual, setManual] = useState("");
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanLock = useRef(false);
  const actionLock = useRef(false);
  useEffect(() => {
    let mounted = true;
    client.auth.getSession().then(({ data, error }) => {
      if (mounted) {
        if (error) setMessage(error.message);
        setUserId(data.session?.user.id ?? null);
        setReady(true);
      }
    });
    const auth = client.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUserId(session?.user.id ?? null);
        setReady(true);
      }
    });
    if (AppState.currentState === "active") client.auth.startAutoRefresh();
    const state = AppState.addEventListener("change", (s) => {
      if (s === "active") client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    });
    return () => {
      mounted = false;
      auth.data.subscription.unsubscribe();
      state.remove();
      client.auth.stopAutoRefresh();
    };
  }, [client]);
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    listOrgs(client)
      .then((items) => {
        if (!cancelled) {
          setOrgs(items);
          setOrgId(items[0]?.id ?? "");
        }
      })
      .catch((e) => {
        if (!cancelled) setMessage(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [client, userId]);
  const refresh = useCallback(async () => {
    if (!orgId) return;
    const data = await loadFleet(client, orgId);
    setBatteries(data.batteries);
    setDrones(data.drones);
    setSessions(data.sessions);
  }, [client, orgId]);
  useEffect(() => {
    if (orgId && userId) refresh().catch((e) => setMessage(errorMessage(e)));
  }, [orgId, userId, refresh]);
  async function run(action: () => Promise<void>) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }
  function choose(payload: string) {
    const id = parseBatteryQr(payload);
    if (!id || !batteries.some((b) => b.id === id)) {
      Alert.alert(
        "Battery not in this organization",
        "Refresh your fleet or select the correct organization.",
      );
      return;
    }
    setBatteryId(id);
    setManual("");
  }
  async function scan() {
    const result = permission?.granted ? permission : await requestPermission();
    if (!result.granted) {
      Alert.alert(
        "Camera permission needed",
        "Use a manual identifier if you prefer.",
      );
      return;
    }
    scanLock.current = false;
    setScanning(true);
  }
  const selected = batteries.find((b) => b.id === batteryId);
  return (
    <View style={s.root}>
      <StatusBar style="dark" />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}
      >
        <Text style={s.brand}>LogSkies / Field</Text>
        <Text style={s.muted}>ONLINE WORKSPACE · Shared fleet records</Text>
        {message ? (
          <View style={s.card}>
            <Text accessibilityRole="alert" style={s.text}>
              {message}
            </Text>
          </View>
        ) : null}
        {!ready ? (
          <Text style={s.text}>Loading account…</Text>
        ) : !userId ? (
          <View style={s.card}>
            <Text style={s.heading}>Sign in to your fleet</Text>
            <TextInput
              accessibilityLabel="Email"
              placeholder="Email"
              placeholderTextColor="#68716a"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={s.input}
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              accessibilityLabel="Password"
              placeholder="Password"
              placeholderTextColor="#68716a"
              autoCapitalize="none"
              secureTextEntry
              style={s.input}
              value={password}
              onChangeText={setPassword}
            />
            <Button
              disabled={busy || !email || !password}
              text={busy ? "Signing in…" : "Sign in"}
              onPress={() =>
                void run(async () => {
                  const { error } = await client.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                  });
                  if (error) throw error;
                  setPassword("");
                })
              }
            />
            <Text style={s.muted}>
              Create your account and organization in the web workspace first.
            </Text>
          </View>
        ) : (
          <>
            <View style={s.card}>
              <Text style={s.heading}>Organization</Text>
              {orgs.length ? (
                orgs.map((o) => (
                  <Button
                    key={o.id}
                    disabled={busy}
                    text={`${o.id === orgId ? "✓ " : ""}${o.name}`}
                    onPress={() => {
                      setOrgId(o.id);
                      setBatteries([]);
                      setDrones([]);
                      setSessions([]);
                      setBatteryId("");
                      setDroneId("");
                    }}
                  />
                ))
              ) : (
                <Text style={s.muted}>
                  No memberships found. Create an organization on web, then sign
                  in again.
                </Text>
              )}
              <Button
                secondary
                disabled={busy}
                text="Sign out"
                onPress={() =>
                  void run(async () => {
                    const { error } = await client.auth.signOut();
                    if (error) throw error;
                    setOrgId("");
                    setOrgs([]);
                    setBatteries([]);
                    setDrones([]);
                    setSessions([]);
                    setBatteryId("");
                    setDroneId("");
                    setScanning(false);
                  })
                }
              />
            </View>
            {orgId ? (
              <>
                <Button
                  disabled={busy}
                  secondary
                  text="Refresh shared fleet"
                  onPress={() => void run(refresh)}
                />
                <Button
                  disabled={busy || !batteries.length}
                  text="Scan battery QR"
                  onPress={() => void scan()}
                />
                {scanning ? (
                  <View style={s.card}>
                    <CameraView
                      style={{ height: 300 }}
                      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                      onBarcodeScanned={({ data }) => {
                        if (scanLock.current) return;
                        scanLock.current = true;
                        setScanning(false);
                        choose(data);
                      }}
                    />
                    <Button
                      secondary
                      text="Cancel"
                      onPress={() => setScanning(false)}
                    />
                  </View>
                ) : null}
                <View style={s.card}>
                  <Text style={s.heading}>Battery</Text>
                  {batteries.length ? (
                    batteries.map((b) => (
                      <Button
                        secondary
                        disabled={busy}
                        key={b.id}
                        text={`${batteryId === b.id ? "✓ " : ""}${b.asset_tag} · ${b.capacity_mah} mAh`}
                        onPress={() => setBatteryId(b.id)}
                      />
                    ))
                  ) : (
                    <Text style={s.muted}>
                      Add a battery in the web workspace.
                    </Text>
                  )}
                  <TextInput
                    accessibilityLabel="Battery QR identifier"
                    placeholder="logskies:battery:…"
                    placeholderTextColor="#68716a"
                    autoCapitalize="none"
                    style={s.input}
                    value={manual}
                    onChangeText={setManual}
                  />
                  <Button
                    secondary
                    disabled={busy || !manual}
                    text="Use identifier"
                    onPress={() => choose(manual.trim())}
                  />
                </View>
                <View style={s.card}>
                  <Text style={s.heading}>Drone</Text>
                  {drones.length ? (
                    drones.map((d) => (
                      <Button
                        secondary
                        disabled={busy}
                        key={d.id}
                        text={`${droneId === d.id ? "✓ " : ""}${d.model_name}`}
                        onPress={() => setDroneId(d.id)}
                      />
                    ))
                  ) : (
                    <Text style={s.muted}>
                      Add a drone in the web workspace.
                    </Text>
                  )}
                  <Text style={s.muted}>
                    {selected
                      ? `${selected.asset_tag} · Health unassessed`
                      : "Select a battery before recording."}
                  </Text>
                  <Button
                    disabled={busy || !batteryId || !droneId}
                    text={busy ? "Saving…" : "Record online preflight session"}
                    onPress={() =>
                      void run(async () => {
                        await savePreflight(client, {
                          orgId,
                          batteryId,
                          droneId,
                          eventId: randomUUID(),
                          scannedAt: new Date().toISOString(),
                        });
                        await refresh();
                        setMessage(
                          "Session saved online. Refresh the web workspace to see it.",
                        );
                      })
                    }
                  />
                  <Text style={s.muted}>
                    An internet connection is required. Preflight records do not
                    confirm takeoff.
                  </Text>
                </View>
                <View style={s.card}>
                  <Text style={s.heading}>Shared session history</Text>
                  {sessions.length ? (
                    sessions.map((record) => (
                      <View key={record.id} style={s.history}>
                        <Text style={s.text}>
                          {batteries.find((b) => b.id === record.battery_id)
                            ?.asset_tag ?? "Unknown battery"}
                        </Text>
                        <Text style={s.muted}>
                          {new Date(record.scanned_at).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })}{" "}
                          IST
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={s.muted}>No sessions recorded.</Text>
                  )}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}
function Button({
  text,
  onPress,
  disabled = false,
  secondary = false,
}: {
  text: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[s.button, secondary && s.secondary, disabled && { opacity: 0.5 }]}
    >
      <Text style={secondary ? s.text : s.buttonText}>{text}</Text>
    </Pressable>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f6f3" },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40, gap: 18 },
  brand: { fontSize: 25, fontWeight: "600", color: "#6c9e37" },
  heading: { fontSize: 19, fontWeight: "600", color: "#303830" },
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e0e6d9",
    borderRadius: 12,
    padding: 20,
    gap: 14,
  },
  text: { color: "#303830", fontSize: 14 },
  muted: { color: "#68716a", fontSize: 12, lineHeight: 19 },
  input: {
    borderWidth: 1,
    borderColor: "#e0e6d9",
    borderRadius: 7,
    padding: 12,
    color: "#303830",
  },
  button: {
    backgroundColor: "#527c27",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#e0e6d9",
  },
  buttonText: { color: "#ffffff", fontWeight: "600" },
  history: {
    borderTopWidth: 1,
    borderColor: "#e0e6d9",
    paddingTop: 14,
    gap: 6,
  },
});
