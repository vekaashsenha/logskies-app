import React, { useEffect, useRef, useState } from "react";
import ConnectedApp, { connectedClient } from "./ConnectedApp";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { CameraView, useCameraPermissions } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  batteryStatus,
  parseBatteryQr,
  sampleBatteries,
  sampleDrones,
  type Session,
} from "@logskies/domain";
const key = "logskies-mobile-demo-v1";
export default function App() {
  return connectedClient ? <ConnectedApp /> : <DemoApp />;
}
function DemoApp() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [selectedId, setSelectedId] = useState(sampleBatteries[0].id);
  const [manual, setManual] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const scanLock = useRef(false);
  const saveLock = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (raw) {
          const value = JSON.parse(raw);
          if (Array.isArray(value)) setSessions(value);
        }
      })
      .catch(() =>
        Alert.alert(
          "Storage unavailable",
          "Previous demo sessions could not be loaded.",
        ),
      )
      .finally(() => setLoaded(true));
  }, []);
  const selected = sampleBatteries.find((b) => b.id === selectedId)!;
  function selectPayload(payload: string) {
    const id = parseBatteryQr(payload);
    if (!id || !sampleBatteries.some((b) => b.id === id)) {
      Alert.alert(
        "Unknown battery",
        "Scan a registered demo battery identifier. Web-created packs become available after backend connection.",
      );
      return;
    }
    setSelectedId(id);
    setManual("");
  }
  async function scan() {
    const result = permission?.granted ? permission : await requestPermission();
    if (!result.granted) {
      Alert.alert(
        "Camera access needed",
        "You can use the manual battery identifier instead.",
      );
      return;
    }
    scanLock.current = false;
    setScanning(true);
  }
  async function record() {
    if (!loaded || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    const session: Session = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      batteryId: selectedId,
      droneId: sampleDrones[0].id,
      scannedAt: new Date().toISOString(),
    };
    const next = [session, ...sessions];
    try {
      await AsyncStorage.setItem(key, JSON.stringify(next));
      setSessions(next);
      Alert.alert(
        "Recorded on this device",
        "This demo session is not yet synced to the web app.",
      );
    } catch {
      Alert.alert("Could not save", "The session was not recorded. Try again.");
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }
  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.brand}>
          LogSkies <Text style={styles.accent}>/ Field</Text>
        </Text>
        <Text style={styles.eyebrow}>PILOT WORKSPACE</Text>
        <Text style={styles.title}>Ready for your next mission.</Text>
        <View style={styles.notice}>
          <Text style={styles.muted}>
            LOCAL DEMO · Sample fleet. Sessions stay on this device. Shared
            backend and offline sync are pending.
          </Text>
        </View>
        {scanning ? (
          <View style={styles.card}>
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={({ data }) => {
                if (scanLock.current) return;
                scanLock.current = true;
                setScanning(false);
                selectPayload(data);
              }}
            />
            <Pressable
              accessibilityRole="button"
              style={styles.secondary}
              onPress={() => setScanning(false)}
            >
              <Text style={styles.text}>Cancel scan</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            style={styles.primary}
            onPress={scan}
          >
            <Text style={styles.primaryText}>Scan battery QR</Text>
          </Pressable>
        )}
        <View style={styles.card}>
          <Text style={styles.heading}>Select a demo battery</Text>
          {sampleBatteries.map((b) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: b.id === selectedId }}
              key={b.id}
              style={[styles.choice, b.id === selectedId && styles.selected]}
              onPress={() => setSelectedId(b.id)}
            >
              <Text style={styles.text}>{b.tag}</Text>
              <Text style={styles.muted}>
                {b.capacityMah.toLocaleString()} mAh · {batteryStatus(b.health)}
              </Text>
            </Pressable>
          ))}
          <TextInput
            accessibilityLabel="Battery QR identifier"
            style={styles.input}
            value={manual}
            onChangeText={setManual}
            placeholder="logskies:battery:demo-battery-01"
            placeholderTextColor="#68716a"
            autoCapitalize="none"
          />
          <Pressable
            accessibilityRole="button"
            style={styles.secondary}
            onPress={() => selectPayload(manual.trim())}
          >
            <Text style={styles.text}>Use manual identifier</Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>PREFLIGHT ASSOCIATION</Text>
          <Text style={styles.heading}>{selected.tag}</Text>
          <Text style={styles.muted}>{sampleDrones[0].name}</Text>
          <Text style={styles.muted}>
            Health: {batteryStatus(selected.health)}
          </Text>
          <Text style={styles.muted}>
            A session does not confirm takeoff or increase cycle count.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={!loaded || saving}
            style={[styles.primary, (!loaded || saving) && styles.disabled]}
            onPress={record}
          >
            <Text style={styles.primaryText}>
              {saving ? "Saving…" : "Record preflight session"}
            </Text>
          </Pressable>
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>Device session history</Text>
          {sessions.length === 0 ? (
            <Text style={styles.muted}>No sessions recorded yet.</Text>
          ) : (
            sessions.map((s) => (
              <View key={s.id} style={styles.history}>
                <Text style={styles.text}>
                  {sampleBatteries.find((b) => b.id === s.batteryId)?.tag ||
                    "Unknown pack"}
                </Text>
                <Text style={styles.muted}>
                  {new Date(s.scannedAt).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}{" "}
                  IST
                </Text>
                <Text style={styles.accent}>
                  Local only · Awaiting telemetry
                </Text>
              </View>
            ))
          )}
        </View>
        <Text style={styles.muted}>
          Branded report generation on Android will use the shared reporting
          service. The web prototype already includes the draft PDF preview.
        </Text>
      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f6f3" },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40, gap: 18 },
  brand: { fontSize: 25, fontWeight: "600", color: "#303830" },
  accent: { color: "#6c9e37" },
  eyebrow: { color: "#68716a", fontSize: 10, letterSpacing: 2 },
  title: { fontSize: 32, fontWeight: "600", lineHeight: 39, color: "#303830" },
  notice: {
    borderWidth: 1,
    borderColor: "#e0e6d9",
    borderRadius: 8,
    padding: 15,
  },
  card: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e0e6d9",
    borderRadius: 12,
    padding: 20,
    gap: 14,
  },
  heading: { fontSize: 19, fontWeight: "600", color: "#303830" },
  text: { color: "#303830", fontSize: 14 },
  muted: { color: "#68716a", fontSize: 12, lineHeight: 19 },
  primary: {
    backgroundColor: "#527c27",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryText: { color: "#ffffff", fontWeight: "600" },
  secondary: {
    padding: 13,
    borderColor: "#e0e6d9",
    borderWidth: 1,
    borderRadius: 8,
    alignItems: "center",
  },
  choice: {
    padding: 13,
    borderWidth: 1,
    borderColor: "#e0e6d9",
    borderRadius: 7,
    gap: 5,
  },
  selected: { borderColor: "#6c9e37" },
  input: {
    borderWidth: 1,
    borderColor: "#e0e6d9",
    borderRadius: 7,
    padding: 12,
    color: "#303830",
  },
  camera: { height: 300, borderRadius: 8 },
  history: {
    borderTopWidth: 1,
    borderColor: "#e0e6d9",
    paddingTop: 13,
    gap: 6,
  },
  disabled: { opacity: 0.5 },
});
