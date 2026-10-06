import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Linking from "expo-linking";
import { useWorkspace } from "../../ConnectedApp";
import {
  Badge,
  Body,
  Button,
  Card,
  Empty,
  Field,
  Heading,
  Icon,
  Muted,
  Row,
  Screen,
  colors,
  styles,
} from "./field-ui";
export function displayTime(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return "Time unavailable";
  return (
    new Date(value).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }) + " IST"
  );
}
function purpose(value: string) {
  const label = value.replace(/_/g, " ");
  return label
    ? label.charAt(0).toUpperCase() + label.slice(1)
    : "Purpose not set";
}
export function LoginScreen() {
  const w = useWorkspace(),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [googleConsent, setGoogleConsent] = useState(false);
  return (
    <Screen
      title="Welcome back"
      subtitle="Your fleet records, ready for the field."
    >
      <View style={{ paddingVertical: 14 }}>
        <Icon name="paper-plane-outline" size={60} />
      </View>
      <Card>
        <Heading>Sign in to LogSkies</Heading>
        {!w.configured && (
          <Muted>
            The shared workspace is not configured in this build. Contact
            support or use the website.
          </Muted>
        )}
        <Field
          label="Email address"
          placeholder="you@company.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <Field
          label="Password"
          placeholder="Your password"
          autoCapitalize="none"
          autoComplete="current-password"
          secureTextEntry={!show}
          value={password}
          onChangeText={setPassword}
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => setShow(!show)}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={{ color: colors.green }}>
            {show ? "Hide password" : "Show password"}
          </Text>
        </Pressable>
        <Button
          title={w.busy ? "Please wait…" : "Sign in"}
          disabled={w.busy || !w.configured || !email.trim() || !password}
          onPress={() =>
            void w.signIn(email, password).then((ok) => {
              if (ok) setPassword("");
            })
          }
        />
        <Button
          title="Forgot password?"
          secondary
          disabled={w.busy || !w.configured || !email.trim()}
          onPress={() => void w.resetPassword(email)}
        />
      </Card>
      <Card>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: googleConsent }}
          onPress={() => setGoogleConsent(!googleConsent)}
          style={{ minHeight: 44 }}
        >
          <Body>
            {googleConsent ? "☑" : "☐"} I agree to the Terms and have read the
            Privacy Policy before continuing with Google.
          </Body>
        </Pressable>
        <Button
          title="Continue with Google"
          secondary
          disabled={w.busy || !w.googleAvailable || !googleConsent}
          onPress={() => void w.signInGoogle()}
        />
        {!w.googleAvailable && (
          <Muted>
            Google sign-in setup is pending. Email sign-in is available.
          </Muted>
        )}
      </Card>
      <Body>New to LogSkies?</Body>
      <Button
        title="Create account"
        secondary
        onPress={() => void w.openWeb("/signup")}
      />
      <Muted>
        Use the same account on web and Android. An internet connection is
        required.
      </Muted>
      <View style={{ flexDirection: "row", gap: 20, flexWrap: "wrap" }}>
        {["FAQ", "Privacy", "Terms"].map((label) => (
          <Pressable
            key={label}
            accessibilityRole="link"
            style={{ minHeight: 44, justifyContent: "center" }}
            onPress={() => void w.openWeb("/" + label.toLowerCase())}
          >
            <Text style={{ color: colors.green }}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
export function HomeScreen() {
  const w = useWorkspace(),
    attention = w.flights.filter(
      (f) =>
        !f.airspace_checked_utc ||
        !f.occurrence_type ||
        f.occurrence_type === "unknown",
    ).length;
  const start = () => {
    w.resetPreflight();
    router.navigate("/scan");
  };
  return (
    <Screen
      title="Your field workspace"
      subtitle={w.org?.name || "Choose your organization in More"}
    >
      {!w.orgId && !w.loading ? (
        <Empty
          title="Set up your team"
          description="Create an organization in the web workspace, then sign in again."
          action="Open web workspace"
          onPress={() => void w.openWeb()}
        />
      ) : (
        <>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.pale, borderColor: "#DDE9CD" },
            ]}
          >
            <Badge text="BEFORE YOUR NEXT FLIGHT" />
            <Heading>Pair your drone and battery</Heading>
            <Muted>Save a preflight association in three simple steps.</Muted>
            <Button
              title="Start preflight"
              icon="scan-outline"
              disabled={w.loading || w.busy || !w.orgId}
              onPress={start}
            />
          </View>
          <View style={styles.grid}>
            {[
              ["Drones", w.drones.length],
              ["Batteries", w.batteries.length],
              ["Imported intervals", w.flights.length],
              ["Preflight sessions", w.sessions.length],
            ].map(([label, value]) => (
              <View key={label} style={styles.stat}>
                <Text style={styles.number}>{value}</Text>
                <Muted>{label}</Muted>
              </View>
            ))}
          </View>
          {attention > 0 && (
            <Row
              title={`${attention} record${attention === 1 ? "" : "s"} with evidence gaps`}
              subtitle="Airspace check or occurrence declaration missing"
              icon="document-text-outline"
              onPress={() => router.navigate("/flights")}
            />
          )}
          <Heading>Recent flights</Heading>
          {w.flights.length ? (
            w.flights.slice(0, 3).map((f) => (
              <Row
                key={f.id}
                title={purpose(f.purpose)}
                subtitle={`${displayTime(f.start_utc)} · ${Number(f.duration).toFixed(1)} min`}
                icon="paper-plane-outline"
                onPress={() =>
                  router.push({
                    pathname: "/flight/[id]",
                    params: { id: f.id },
                  })
                }
              />
            ))
          ) : (
            <Empty
              title="Your flight history starts here"
              description="Import a .bin, .tlog or .ulg file on web. Saved intervals will appear here."
              action="Open web imports"
              onPress={() => void w.openWeb()}
            />
          )}
          <Muted>
            Counts show the loaded history: up to 50 imported intervals and 100
            preflight sessions. They are not lifetime totals.
          </Muted>
        </>
      )}
    </Screen>
  );
}
export function FleetScreen() {
  const w = useWorkspace();
  return <FleetContent key={w.orgId} />;
}
function FleetContent() {
  const w = useWorkspace(),
    [kind, setKind] = useState<"drones" | "batteries">("drones"),
    [query, setQuery] = useState(""),
    [expanded, setExpanded] = useState<string | null>(null);
  const matches = (text: string) =>
    text.toLowerCase().includes(query.trim().toLowerCase());
  const drones = w.drones.filter((d) =>
      matches(`${d.model_name} ${d.uin_number || ""}`),
    ),
    batteries = w.batteries.filter((b) =>
      matches(`${b.asset_tag} ${b.chemistry}`),
    );
  return (
    <Screen
      title="Your fleet"
      subtitle="Find a drone or battery without scrolling through forms."
    >
      <View style={{ flexDirection: "row", gap: 10 }}>
        {(["drones", "batteries"] as const).map((type) => (
          <View key={type} style={{ flex: 1 }}>
            <Button
              title={
                type === "drones"
                  ? `Drones (${w.drones.length})`
                  : `Batteries (${w.batteries.length})`
              }
              secondary={kind !== type}
              onPress={() => {
                setKind(type);
                setExpanded(null);
                setQuery("");
              }}
            />
          </View>
        ))}
      </View>
      <Field
        label={kind === "drones" ? "Search drones" : "Search batteries"}
        placeholder={
          kind === "drones" ? "Model or UIN" : "Battery tag or chemistry"
        }
        value={query}
        onChangeText={setQuery}
      />
      <Button
        title={kind === "drones" ? "Add drone on web" : "Add battery on web"}
        icon="add-outline"
        secondary
        disabled={w.busy || !w.orgId}
        onPress={() => void w.openWeb()}
      />
      <Muted>
        Registration and fleet editing are available in the shared web
        workspace.
      </Muted>
      {kind === "drones"
        ? drones.map((d) => (
            <View key={d.id} style={{ gap: 8 }}>
              <Row
                title={d.model_name}
                subtitle={d.uin_number || "UIN not entered"}
                icon="paper-plane-outline"
                onPress={() => setExpanded(expanded === d.id ? null : d.id)}
              />
              {expanded === d.id && (
                <Card>
                  <Heading>Drone details</Heading>
                  <Body>UIN: {d.uin_number || "Not entered"}</Body>
                  <Button
                    title="Use for preflight"
                    disabled={w.busy}
                    onPress={() => {
                      w.resetPreflight();
                      w.selectDrone(d.id);
                      router.navigate("/scan");
                    }}
                  />
                  <Button
                    title="Edit on web"
                    secondary
                    onPress={() => void w.openWeb()}
                  />
                </Card>
              )}
            </View>
          ))
        : batteries.map((b) => (
            <View key={b.id} style={{ gap: 8 }}>
              <Row
                title={b.asset_tag}
                subtitle={`${b.cell_count}S ${b.chemistry} · ${b.capacity_mah.toLocaleString("en-IN")} mAh`}
                icon="battery-half-outline"
                onPress={() => setExpanded(expanded === b.id ? null : b.id)}
              />
              {expanded === b.id && (
                <Card>
                  <Badge text="Health unassessed" warning />
                  <Muted>
                    A battery tag identifies the physical pack. Rated capacity
                    alone does not establish its health.
                  </Muted>
                  <Button
                    title="Open preflight"
                    disabled={w.busy}
                    onPress={() => {
                      w.resetPreflight();
                      router.navigate("/scan");
                    }}
                  />
                  <Button
                    title="Edit / get QR label on web"
                    secondary
                    onPress={() => void w.openWeb()}
                  />
                </Card>
              )}
            </View>
          ))}
      {!(kind === "drones" ? drones.length : batteries.length) && (
        <Empty
          title={query ? "No matching assets" : `No ${kind} yet`}
          description={
            query
              ? "Try a different model, UIN or battery tag."
              : "Add your first asset in the web workspace, then refresh here."
          }
        />
      )}
    </Screen>
  );
}
export function ScanScreen() {
  const w = useWorkspace();
  return <PreflightFlow key={`${w.orgId}-${w.preflightRevision}`} />;
}
function PreflightFlow() {
  const w = useWorkspace(),
    [step, setStep] = useState(0),
    [manual, setManual] = useState(""),
    [query, setQuery] = useState(""),
    [scanning, setScanning] = useState(false),
    [cameraNotice, setCameraNotice] = useState("");
  const [permission, requestPermission] = useCameraPermissions(),
    scanLock = useRef(false);
  useFocusEffect(
    useCallback(
      () => () => {
        setScanning(false);
      },
      [],
    ),
  );
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") setScanning(false);
    });
    return () => sub.remove();
  }, []);
  const battery = w.batteries.find((b) => b.id === w.batteryId),
    drone = w.drones.find((d) => d.id === w.droneId);
  const scan = async () => {
    try {
      const result = permission?.granted
        ? permission
        : await requestPermission();
      if (!result.granted) {
        setCameraNotice(
          "Camera access is off. Select a battery below, or enable camera access in your phone settings.",
        );
        return;
      }
      scanLock.current = false;
      setCameraNotice("");
      setScanning(true);
    } catch {
      setCameraNotice("Camera unavailable. Select a battery manually below.");
    }
  };
  if (w.savedSession)
    return (
      <Screen title="Preflight saved" subtitle={w.org?.name}>
        <Card>
          <Icon name="checkmark-circle-outline" size={52} />
          <Heading>
            {w.preview
              ? "Example session recorded"
              : "Your association is saved online"}
          </Heading>
          <Body>
            {drone?.model_name} + {battery?.asset_tag}
          </Body>
          <Muted>{displayTime(w.scannedAt)}</Muted>
          <Muted>
            This records a drone–battery association. It does not confirm
            takeoff or authorize flight.
          </Muted>
          <Button
            title="Start another preflight"
            onPress={() => {
              w.resetPreflight();
              setStep(0);
            }}
          />
          <Button
            title="View session history"
            secondary
            onPress={() => router.navigate("/flights")}
          />
        </Card>
      </Screen>
    );
  return (
    <Screen
      title="New preflight"
      subtitle={w.org?.name || "Select an organization in More"}
    >
      <View style={{ flexDirection: "row", gap: 8 }}>
        {["Drone", "Battery", "Review"].map((label, i) => (
          <View key={label} style={{ flex: 1, gap: 8 }}>
            <View
              style={{
                height: 4,
                backgroundColor: i <= step ? colors.green : colors.border,
                borderRadius: 4,
              }}
            />
            <Text
              style={{
                color: i === step ? colors.green : colors.muted,
                fontSize: 12,
              }}
            >
              {i + 1}. {label}
            </Text>
          </View>
        ))}
      </View>
      {step === 0 && (
        <>
          <Heading>Choose your drone</Heading>
          <Field
            label="Find a drone"
            placeholder="Model or UIN"
            value={query}
            onChangeText={setQuery}
          />
          {w.drones
            .filter((d) =>
              `${d.model_name} ${d.uin_number || ""}`
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((d) => (
              <Row
                key={d.id}
                title={d.model_name}
                subtitle={d.uin_number || "UIN not entered"}
                selected={w.droneId === d.id}
                disabled={w.busy}
                icon="paper-plane-outline"
                onPress={() => w.selectDrone(d.id)}
              />
            ))}
          {!w.drones.length && (
            <Empty
              title="Add your drone first"
              description="Register it in the web workspace and refresh your fleet."
              action="Open web workspace"
              onPress={() => void w.openWeb()}
            />
          )}
          <Button
            title="Continue to battery"
            disabled={!drone || w.loading || w.busy}
            onPress={() => {
              setQuery("");
              setStep(1);
            }}
          />
        </>
      )}
      {step === 1 && (
        <>
          <Heading>Scan your battery label</Heading>
          <Muted>Using {drone?.model_name}. A manual choice works too.</Muted>
          {scanning ? (
            <Card>
              <CameraView
                style={{ height: 240, borderRadius: 12 }}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={({ data }) => {
                  if (scanLock.current) return;
                  scanLock.current = true;
                  setScanning(false);
                  if (w.choosePayload(data)) setStep(2);
                }}
              />
              <Button
                title="Close camera"
                secondary
                onPress={() => setScanning(false)}
              />
            </Card>
          ) : (
            <View
              style={[
                styles.card,
                { alignItems: "center", paddingVertical: 28 },
              ]}
            >
              <Icon name="scan-outline" size={64} />
              <Body>Point your camera at a LogSkies QR label</Body>
              <Button
                title="Open QR scanner"
                disabled={!w.batteries.length || w.busy}
                onPress={() => void scan()}
              />
            </View>
          )}
          {!!cameraNotice && <Muted>{cameraNotice}</Muted>}
          <Field
            label="Battery tag or QR identifier"
            placeholder="e.g. BATT-AG-001"
            value={manual}
            onChangeText={setManual}
            autoCapitalize="none"
          />
          <Button
            title="Use this identifier"
            secondary
            disabled={!manual.trim() || w.busy}
            onPress={() => {
              if (w.choosePayload(manual.trim())) setStep(2);
            }}
          />
          <Heading>Or select your battery</Heading>
          {w.batteries.map((b) => (
            <Row
              key={b.id}
              title={b.asset_tag}
              subtitle={`${b.cell_count}S ${b.chemistry} · ${b.capacity_mah} mAh`}
              icon="battery-half-outline"
              disabled={w.busy}
              selected={w.batteryId === b.id}
              onPress={() => {
                w.selectBattery(b.id);
                setStep(2);
              }}
            />
          ))}
          {!w.batteries.length && (
            <Empty
              title="No batteries registered"
              description="Add a physical pack on web, then refresh here."
              action="Open web workspace"
              onPress={() => void w.openWeb()}
            />
          )}
          <Button
            title="Back to drone"
            secondary
            onPress={() => {
              setScanning(false);
              setStep(0);
            }}
          />
        </>
      )}
      {step === 2 && (
        <>
          <Heading>Check your association</Heading>
          <Card>
            <Badge text="PREFLIGHT RECORD" />
            <Muted>Drone</Muted>
            <Body>{drone?.model_name}</Body>
            <Muted>{drone?.uin_number || "UIN not entered"}</Muted>
            <View style={styles.divider} />
            <Muted>Battery</Muted>
            <Body>{battery?.asset_tag}</Body>
            <Muted>
              {battery?.cell_count}S {battery?.chemistry} ·{" "}
              {battery?.capacity_mah} mAh
            </Muted>
            <Badge text="Battery health unassessed" warning />
            <View style={styles.divider} />
            <Muted>Battery selection / scan time</Muted>
            <Body>{displayTime(w.scannedAt)}</Body>
          </Card>
          <Muted>
            Confirm the physical pack and drone match. Complete your operational
            checks separately. Internet is required to save.
          </Muted>
          <Button
            title={w.busy ? "Saving…" : "Save preflight session"}
            disabled={w.busy || !battery || !drone || w.loading}
            onPress={() => void w.recordPreflight()}
          />
          <Button
            title="Change battery"
            secondary
            disabled={w.busy}
            onPress={() => setStep(1)}
          />
          <Button
            title="Change drone"
            secondary
            disabled={w.busy}
            onPress={() => setStep(0)}
          />
        </>
      )}
    </Screen>
  );
}
export function FlightsScreen() {
  const w = useWorkspace(),
    [mode, setMode] = useState<"flights" | "sessions">("flights"),
    [query, setQuery] = useState("");
  const filtered = w.flights.filter((f) =>
    `${f.filename} ${f.purpose}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <Screen
      title="Flight history"
      subtitle="Your shared records, one flight at a time."
    >
      <View style={{ flexDirection: "row", gap: 10 }}>
        {(["flights", "sessions"] as const).map((value) => (
          <View key={value} style={{ flex: 1 }}>
            <Button
              title={
                value === "flights" ? "Imported flights" : "Preflight sessions"
              }
              secondary={mode !== value}
              onPress={() => setMode(value)}
            />
          </View>
        ))}
      </View>
      {mode === "flights" ? (
        <>
          <Field
            label="Search flights"
            placeholder="Purpose or file name"
            value={query}
            onChangeText={setQuery}
          />
          <Button
            title="Import logs / reports on web"
            secondary
            icon="open-outline"
            onPress={() => void w.openWeb()}
          />
          {filtered.map((f) => (
            <View key={f.id} style={{ gap: 8 }}>
              <Row
                title={purpose(f.purpose)}
                subtitle={`${displayTime(f.start_utc)} · ${Number(f.duration).toFixed(1)} min`}
                icon="paper-plane-outline"
                onPress={() =>
                  router.push({
                    pathname: "/flight/[id]",
                    params: { id: f.id },
                  })
                }
              />
              <Badge
                text={
                  f.airspace_checked_utc
                    ? "Operator evidence recorded — review required"
                    : "Airspace evidence pending"
                }
                warning={!f.airspace_checked_utc}
              />
            </View>
          ))}
          {!filtered.length && (
            <Empty
              title={query ? "No matching flights" : "No imported flights yet"}
              description="Import a supported log on web. It will appear here after refresh."
            />
          )}
        </>
      ) : (
        <>
          {w.sessions.map((record) => (
            <Card key={record.id}>
              <Heading>
                {w.drones.find((d) => d.id === record.drone_id)?.model_name ||
                  "Drone unavailable"}
              </Heading>
              <Body>
                {w.batteries.find((b) => b.id === record.battery_id)
                  ?.asset_tag || "Battery unavailable"}
              </Body>
              <Muted>{displayTime(record.scanned_at)}</Muted>
              <Badge text="Association only · not a confirmed flight" />
            </Card>
          ))}
          {!w.sessions.length && (
            <Empty
              title="No preflight sessions yet"
              description="Choose a drone and battery before your next mission."
              action="Start preflight"
              onPress={() => {
                w.resetPreflight();
                router.navigate("/scan");
              }}
            />
          )}
        </>
      )}
      <Muted>
        Showing up to 50 imported intervals or 100 preflight sessions. Log
        imports and full evidence review remain available on web.
      </Muted>
    </Screen>
  );
}
export function FlightDetailScreen() {
  const w = useWorkspace(),
    { id } = useLocalSearchParams<{ id: string }>(),
    flight = w.flights.find((f) => f.id === id);
  return (
    <Screen
      title="Flight details"
      subtitle="Recorded evidence, subject to review."
    >
      <Button
        title="Back to flights"
        secondary
        icon="arrow-back"
        onPress={() => router.navigate("/flights")}
      />
      {flight ? (
        <>
          <Card>
            <Badge text={flight.format || "Telemetry"} />
            <Heading>{purpose(flight.purpose)}</Heading>
            <Muted>{flight.filename}</Muted>
            <Body>{displayTime(flight.start_utc)}</Body>
            <Body>
              {Number(flight.duration).toFixed(2)} minutes · recorded interval
            </Body>
            <View style={styles.divider} />
            <Muted>Drone</Muted>
            <Body>
              {w.drones.find((d) => d.id === flight.drone_id)?.model_name ||
                "Drone not linked"}
            </Body>
            <Muted>Battery</Muted>
            <Body>
              {w.batteries.find((b) => b.id === flight.battery_id)?.asset_tag ||
                "Battery not linked"}
            </Body>
          </Card>
          <Card>
            <Heading>Evidence review</Heading>
            <Body>
              Airspace check:{" "}
              {flight.airspace_checked_utc
                ? displayTime(flight.airspace_checked_utc)
                : "Pending"}
            </Body>
            <Body>
              Occurrence:{" "}
              {flight.occurrence_type
                ? purpose(flight.occurrence_type)
                : "Not declared"}
            </Body>
            <Muted>
              Operator entries do not establish regulatory compliance. Open the
              web report for the full route, telemetry, supporting documents and
              review checks.
            </Muted>
            {!!flight.occurrence_type &&
              !["unknown", "nil"].includes(flight.occurrence_type) && (
                <Body>
                  Review notification obligations promptly. For covered
                  occurrences, notice is required as soon as reasonably
                  practicable, at most 24 hours after awareness. Saving here
                  does not notify authorities.
                </Body>
              )}
            <Button
              title="Open Flight Operations Reports"
              icon="open-outline"
              onPress={() => void w.openWeb()}
            />
          </Card>
        </>
      ) : (
        <Empty
          title="Record unavailable"
          description="Refresh your shared records, or open the web workspace for older intervals."
          action="Open web workspace"
          onPress={() => void w.openWeb()}
        />
      )}
    </Screen>
  );
}
export function MoreScreen() {
  const w = useWorkspace();
  return (
    <Screen title="More" subtitle="Your team, reports and account.">
      <Card>
        <Heading>Organization</Heading>
        {w.orgs.map((o) => (
          <Row
            key={o.id}
            title={o.name}
            selected={o.id === w.orgId}
            disabled={w.busy}
            icon="business-outline"
            onPress={() => w.selectOrg(o.id)}
          />
        ))}
        {!w.orgs.length && (
          <Muted>Create an organization on web, then sign in again.</Muted>
        )}
      </Card>
      <Row
        title="Flight Operations Reports"
        subtitle="Review, print PDF and export CSV on web"
        icon="document-text-outline"
        onPress={() => void w.openWeb()}
      />
      <Row
        title="Company & pilot profiles"
        subtitle="Company name and shared pilot RPC records"
        icon="business-outline"
        onPress={() => router.push("/profiles")}
      />
      <Heading>Help & privacy</Heading>
      <Row
        title="Help & FAQ"
        icon="help-circle-outline"
        onPress={() => void w.openWeb("/faq")}
      />
      <Row
        title="Contact support"
        subtitle="support@logskies.com"
        icon="mail-outline"
        onPress={() =>
          void w.run(async () => {
            await Linking.openURL("mailto:support@logskies.com");
          })
        }
      />
      <Row
        title="Privacy Policy"
        icon="shield-checkmark-outline"
        onPress={() => void w.openWeb("/privacy")}
      />
      <Row
        title="Terms and Conditions"
        icon="reader-outline"
        onPress={() => void w.openWeb("/terms")}
      />
      <Row
        title="Request account deletion"
        subtitle="Send a request to our support team"
        icon="person-remove-outline"
        onPress={() =>
          void w.run(async () => {
            await Linking.openURL(
              "mailto:support@logskies.com?subject=LogSkies%20account%20deletion%20request",
            );
          })
        }
      />
      <Button
        title="Sign out"
        secondary
        disabled={w.busy}
        icon="log-out-outline"
        onPress={() => void w.signOut()}
      />
      <Muted>
        Online only. Imported records and reports use the same organization as
        the website. No DGCA endorsement or automatic authority notification.
      </Muted>
    </Screen>
  );
}
