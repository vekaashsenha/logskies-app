"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FlightWorkbench from "@/components/flight-workbench";
import PilotProfiles from "@/components/pilot-profiles";
import { cloudFlightStore } from "@/lib/cloud-flight-storage";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import {
  createClient,
  listOrgs,
  createOrg,
  renameOrg,
  type PilotProfile,
  loadFleet,
  addBattery,
  addDrone,
  savePreflight,
  errorMessage,
  requestPasswordReset,
  googleSignInEnabled,
  beginGoogleSignIn,
  type Org,
  type FleetBattery,
  type FleetDrone,
  type Preflight,
} from "@logskies/api";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const client = url && key ? createClient(url, key) : null;
export default function Workspace({
  initialAuthMode = "signin",
}: {
  initialAuthMode?: "signin" | "signup";
}) {
  const [authMode, setAuthMode] = useState(initialAuthMode);
  const [googleAvailable, setGoogleAvailable] = useState<boolean | null>(null);
  const authEpoch = useRef(0);
  const [authGeneration, setAuthGeneration] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState("");
  const [orgName, setOrgName] = useState("");
  const [batteries, setBatteries] = useState<FleetBattery[]>([]);
  const [drones, setDrones] = useState<FleetDrone[]>([]);
  const [sessions, setSessions] = useState<Preflight[]>([]);
  const [tag, setTag] = useState("");
  const [capacity, setCapacity] = useState("16000");
  const [chemistry, setChemistry] = useState("LiPo");
  const [cells, setCells] = useState("6");
  const [droneName, setDroneName] = useState("");
  const [uin, setUin] = useState("");
  const [batteryId, setBatteryId] = useState("");
  const [droneId, setDroneId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [logoRecord, setLogo] = useState({ path: "", url: "" });
  const [qrRecord, setQr] = useState({ batteryId: "", url: "" });
  const [canAdmin, setCanAdmin] = useState(false);
  const [pilots, setPilots] = useState<PilotProfile[]>([]);
  const [companyName, setCompanyName] = useState("");
  const activeOrg = orgs.find((o) => o.id === orgId);
  useEffect(() => {
    let active = true;
    if (url && key)
      googleSignInEnabled(url, key)
        .then((enabled) => {
          if (active) setGoogleAvailable(enabled);
        })
        .catch(() => {
          if (active) setGoogleAvailable(false);
        });
    return () => {
      active = false;
    };
  }, []);
  const flightStore = useMemo(
    () => (client && orgId ? cloudFlightStore(client, orgId) : undefined),
    [orgId],
  );
  const logo =
    logoRecord.path === activeOrg?.logo_storage_path ? logoRecord.url : "";
  const qr = qrRecord.batteryId === batteryId ? qrRecord.url : "";
  const refresh = useCallback(async () => {
    if (!client || !orgId || !userId) return;
    const epoch = authEpoch.current;
    const fleet = await loadFleet(client, orgId);
    if (epoch !== authEpoch.current) return;
    setBatteries(fleet.batteries);
    setDrones(fleet.drones);
    setSessions(fleet.sessions);
    const { data, error } = await client
      .from("organization_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", userId)
      .single();
    if (error) throw error;
    if (epoch !== authEpoch.current) return;
    setCanAdmin(["owner", "admin"].includes(data.role));
  }, [orgId, userId]);
  useEffect(() => {
    if (!client) return;
    let mounted = true;
    client.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setMessage(error.message);
      setUserId(data.session?.user.id ?? null);
      if (
        data.session &&
        sessionStorage.getItem("logskies-password-recovery") === "1"
      )
        setRecovering(true);
      setReady(true);
    });
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        if (_event === "PASSWORD_RECOVERY") {
          sessionStorage.setItem("logskies-password-recovery", "1");
          setRecovering(true);
        }
        if (_event === "SIGNED_OUT") {
          sessionStorage.removeItem("logskies-password-recovery");
          setRecovering(false);
        }
        if (_event === "SIGNED_IN" || _event === "SIGNED_OUT") {
          authEpoch.current++;
          setAuthGeneration((value) => value + 1);
          setOrgs([]);
          setOrgId("");
          setBatteries([]);
          setDrones([]);
          setSessions([]);
          setCanAdmin(false);
          setLogo({ path: "", url: "" });
          setQr({ batteryId: "", url: "" });
          setBatteryId("");
          setDroneId("");
          setPassword("");
        }
        setUserId(session?.user.id ?? null);
        setReady(true);
      }
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);
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
      .catch((error) => {
        if (!cancelled) setMessage(errorMessage(error));
      });
    return () => {
      cancelled = true;
    };
  }, [userId, authGeneration]);
  useEffect(() => {
    if (!client || !orgId || !userId) return;
    let cancelled = false;
    Promise.all([
      loadFleet(client, orgId),
      client
        .from("organization_members")
        .select("role")
        .eq("org_id", orgId)
        .eq("user_id", userId)
        .single(),
    ])
      .then(([fleet, membership]) => {
        if (cancelled) return;
        if (membership.error) throw membership.error;
        setBatteries(fleet.batteries);
        setDrones(fleet.drones);
        setSessions(fleet.sessions);
        setCanAdmin(["owner", "admin"].includes(membership.data.role));
      })
      .catch((e) => {
        if (!cancelled) setMessage(errorMessage(e));
      });
    return () => {
      cancelled = true;
    };
  }, [orgId, userId]);
  useEffect(() => {
    let cancelled = false;
    if (client && activeOrg?.logo_storage_path)
      client.storage
        .from("company-logos")
        .createSignedUrl(activeOrg.logo_storage_path, 3600)
        .then(({ data, error }) => {
          if (cancelled) return;
          if (error) setMessage(error.message);
          else
            setLogo({
              path: activeOrg.logo_storage_path!,
              url: data?.signedUrl ?? "",
            });
        });
    return () => {
      cancelled = true;
    };
  }, [activeOrg]);
  useEffect(() => {
    let cancelled = false;
    if (batteryId)
      QRCode.toDataURL(`logskies:battery:${batteryId}`, {
        width: 240,
        margin: 2,
      })
        .then((value) => {
          if (!cancelled) setQr({ batteryId, url: value });
        })
        .catch((e) => {
          if (!cancelled) setMessage(errorMessage(e));
        });
    return () => {
      cancelled = true;
    };
  }, [batteryId]);
  async function run(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function auth(signup: boolean) {
    if (!client) return;
    if (signup && !termsAccepted) {
      setMessage("Read and agree to the Terms before creating an account.");
      return;
    }
    if (signup && password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    await run(async () => {
      const result = signup
        ? await client!.auth.signUp({
            email: email.trim(),
            password,
            options: { emailRedirectTo: window.location.origin + "/workspace" },
          })
        : await client!.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
      if (result.error) throw result.error;
      setPassword("");
      setConfirmPassword("");
      if (signup && !result.data.session)
        setMessage("Check your email to confirm your account, then sign in.");
    });
  }
  async function uploadLogo(file: File | undefined) {
    if (!client || !file || !orgId) return;
    await run(async () => {
      if (
        !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
        file.size > 1048576
      )
        throw new Error("Use a PNG, JPG or WebP logo under 1 MB.");
      const path = `${orgId}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
      const { error } = await client!.storage
        .from("company-logos")
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      const result = await client!
        .from("organizations")
        .update({ logo_storage_path: path })
        .eq("id", orgId);
      if (result.error) throw result.error;
      setOrgs(await listOrgs(client!));
      setMessage("Company logo saved to private storage.");
    });
  }
  if (!client)
    return (
      <main className="content">
        <p className="eyebrow">LOGSKIES / CONNECTED WORKSPACE</p>
        <h1>Connect your Supabase project</h1>
        <section className="panel">
          <p>
            Set NEXT_PUBLIC_SUPABASE_URL and
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in apps/web/.env.local, apply
            the foundation migration, then restart the web app.
          </p>
          <p className="muted">
            Your account and hosted database are not configured yet.
          </p>
        </section>
      </main>
    );
  if (!ready)
    return (
      <main className="content">
        <p>Loading account…</p>
      </main>
    );
  if (recovering && userId)
    return (
      <main className="content">
        <h1>Set a new password</h1>
        <form
          className="panel form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              if (password.length < 8)
                throw new Error("Use at least 8 characters.");
              if (password !== confirmPassword)
                throw new Error("Passwords do not match.");
              const { error } = await client.auth.updateUser({ password });
              if (error) throw error;
              setPassword("");
              setConfirmPassword("");
              sessionStorage.removeItem("logskies-password-recovery");
              setRecovering(false);
              setMessage(
                "Password updated. Use your new password on web and Android.",
              );
            });
          }}
        >
          <p>Choose a password for your shared LogSkies account.</p>
          <label>
            New password
            <input
              required
              minLength={8}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label>
            Confirm new password
            <input
              required
              minLength={8}
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy}>
            {busy ? "Updating…" : "Update password"}
          </button>
          {message && <p role="status">{message}</p>}
        </form>
      </main>
    );
  if (!userId)
    return (
      <main className="content">
        <p className="eyebrow">LOGSKIES / CONNECTED WORKSPACE</p>
        <h1>
          {authMode === "signup"
            ? "Create your LogSkies account"
            : "Sign in to LogSkies"}
        </h1>
        <div className="actions" aria-label="Account access">
          <button
            type="button"
            className={authMode === "signin" ? "primary" : "secondary"}
            disabled={busy}
            aria-pressed={authMode === "signin"}
            onClick={() => {
              setAuthMode("signin");
              setMessage("");
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={authMode === "signup" ? "primary" : "secondary"}
            disabled={busy}
            aria-pressed={authMode === "signup"}
            onClick={() => {
              setAuthMode("signup");
              setMessage("");
            }}
          >
            Create account
          </button>
        </div>
        <form
          className="panel form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            void auth(authMode === "signup");
          }}
        >
          <label>
            Email
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              required
              minLength={8}
              type="password"
              autoComplete={
                authMode === "signup" ? "new-password" : "current-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {authMode === "signup" && (
            <label>
              Confirm password
              <input
                required
                minLength={8}
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </label>
          )}
          <label className="check">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            For account creation or Google sign-in, I agree to the{" "}
            <Link href="/terms" target="_blank">
              Terms and Conditions
            </Link>{" "}
            and have read the{" "}
            <Link href="/privacy" target="_blank">
              Privacy Policy
            </Link>
            .
          </label>
          <button disabled={busy} className="primary">
            {busy
              ? "Working…"
              : authMode === "signup"
                ? "Create account with email"
                : "Sign in with email"}
          </button>
          <p className="muted">Or use your Google account</p>
          <button
            type="button"
            className="secondary"
            disabled={busy || googleAvailable === null}
            onClick={() =>
              void run(async () => {
                if (!googleAvailable)
                  throw new Error(
                    "Google sign-in setup is still pending. Please use email for now.",
                  );
                if (!termsAccepted)
                  throw new Error(
                    "Please agree to the Terms and read the Privacy Policy before continuing with Google.",
                  );
                await beginGoogleSignIn(
                  client,
                  window.location.origin + "/workspace",
                );
              })
            }
          >
            Continue with Google
          </button>
          {googleAvailable === false && (
            <p className="muted">
              Google sign-in is being configured. Email signup and sign-in are
              available now.
            </p>
          )}
          {authMode === "signup" && (
            <p className="muted">
              Check your inbox after creating an account to confirm your email.
            </p>
          )}
          {message && <p role="status">{message}</p>}
          <button
            type="button"
            className="text-button"
            disabled={busy || !email.trim()}
            onClick={() =>
              void run(async () => {
                await requestPasswordReset(
                  client,
                  email,
                  window.location.origin + "/workspace",
                );
                setMessage(
                  "If an account exists for this email, a password reset link will be sent. Open it to choose a new password, then use it on web and Android.",
                );
              })
            }
          >
            Forgot password? Send reset email
          </button>
        </form>
      </main>
    );
  return (
    <main className="content">
      <div className="page-heading no-print">
        <div>
          <p className="eyebrow">LOGSKIES / SHARED FLEET</p>
          <h1>{activeOrg?.name ?? "Create your organization"}</h1>
          <p className="muted">
            Shared fleet records · Private to your organization
          </p>
          <p className="muted">
            Uploaded original logs are stored privately. Authorized LogSkies
            project administrators can access them for technical validation and
            support. Upload only logs you have permission to share.
          </p>
        </div>
        <button
          className="secondary"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const { error } = await client.auth.signOut();
              if (error) throw error;
              setOrgs([]);
              setOrgId("");
              setBatteries([]);
              setDrones([]);
              setSessions([]);
            })
          }
        >
          Sign out
        </button>
      </div>
      {message && (
        <p className="notice no-print" role="status">
          {message}
        </p>
      )}
      <div className="two-columns no-print">
        <section className="panel form-grid">
          <h2>Company profile</h2>
          {orgs.length > 0 && (
            <label>
              Active organization
              <select
                disabled={busy}
                value={orgId}
                onChange={(e) => {
                  authEpoch.current++;
                  setOrgId(e.target.value);
                  setBatteryId("");
                  setDroneId("");
                  setQr({ batteryId: "", url: "" });
                  setBatteries([]);
                  setDrones([]);
                  setSessions([]);
                  setCanAdmin(false);
                }}
              >
                {orgs.map((o) => (
                  <option value={o.id} key={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <form
            className="form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const id = await createOrg(client, orgName.trim());
                setOrgs(await listOrgs(client));
                setOrgId(id);
                setOrgName("");
              });
            }}
          >
            <label>
              New organization name
              <input
                required
                maxLength={120}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </label>
            <button className="secondary" disabled={busy}>
              Create organization
            </button>
          </form>
          {orgId && canAdmin && (
            <form
              className="form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  await renameOrg(client, orgId, companyName);
                  setOrgs(await listOrgs(client));
                  setCompanyName("");
                  setMessage(
                    "Company name saved. New report exports use this name.",
                  );
                });
              }}
            >
              <label>
                Company / operator display name
                <input
                  required
                  maxLength={120}
                  placeholder={activeOrg?.name}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </label>
              <button className="secondary" disabled={busy}>
                Save company name
              </button>
            </form>
          )}
          {orgId && canAdmin && (
            <label>
              Company report logo
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={busy}
                onChange={(e) => void uploadLogo(e.target.files?.[0])}
              />
            </label>
          )}
        </section>
        {orgId && (
          <section className="panel form-grid">
            <h2>Preflight session</h2>
            <label>
              Battery
              <select
                value={batteryId}
                onChange={(e) => setBatteryId(e.target.value)}
              >
                <option value="">Select battery</option>
                {batteries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.asset_tag}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Drone
              <select
                value={droneId}
                onChange={(e) => setDroneId(e.target.value)}
              >
                <option value="">Select drone</option>
                {drones.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.model_name}
                  </option>
                ))}
              </select>
            </label>
            <button
              disabled={busy || !batteryId || !droneId}
              className="primary"
              onClick={() =>
                void run(async () => {
                  await savePreflight(client, {
                    orgId,
                    batteryId,
                    droneId,
                    eventId: crypto.randomUUID(),
                    scannedAt: new Date().toISOString(),
                  });
                  await refresh();
                  setMessage(
                    "Session saved. Android can read it from this organization.",
                  );
                })
              }
            >
              Record session
            </button>
            {qr && (
              <div>
                <Image
                  src={qr}
                  alt="Battery QR label"
                  width={200}
                  height={200}
                  unoptimized
                />
                <p className="muted">
                  {batteries.find((b) => b.id === batteryId)?.asset_tag} · Scan
                  this label in Android.
                </p>
                <a
                  href={qr}
                  download={`logskies-${batteryId}.png`}
                  className="text-button"
                >
                  Download QR label
                </a>
              </div>
            )}
          </section>
        )}
      </div>
      {orgId && canAdmin && (
        <div className="two-columns no-print">
          <form
            className="panel form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await addBattery(
                  client,
                  orgId,
                  tag,
                  Number(capacity),
                  chemistry,
                  Number(cells),
                );
                setTag("");
                await refresh();
              });
            }}
          >
            <h2>Add battery</h2>
            <label>
              Asset tag
              <input
                required
                value={tag}
                maxLength={60}
                onChange={(e) => setTag(e.target.value)}
              />
            </label>
            <label>
              Rated capacity (mAh)
              <input
                required
                type="number"
                min="1"
                max="1000000"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </label>
            <p className="muted">
              Use the manufacturer label. Asset tag is your unique physical pack
              label, for example BATT-001. Health remains unassessed.
            </p>
            <label>
              Chemistry
              <select
                value={chemistry}
                onChange={(e) => setChemistry(e.target.value)}
              >
                <option>LiPo</option>
                <option>Li-Ion</option>
                <option>LiFePO4</option>
              </select>
            </label>
            <label>
              Cell count (series)
              <input
                required
                type="number"
                min="1"
                max="32"
                value={cells}
                onChange={(e) => setCells(e.target.value)}
              />
            </label>
            <button className="primary" disabled={busy}>
              Save battery
            </button>
          </form>
          <form
            className="panel form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await addDrone(client, orgId, droneName, uin);
                setDroneName("");
                setUin("");
                await refresh();
              });
            }}
          >
            <h2>Add drone</h2>
            <label>
              Model / name
              <input
                required
                value={droneName}
                onChange={(e) => setDroneName(e.target.value)}
              />
            </label>
            <label>
              UIN (optional while setting up)
              <input value={uin} onChange={(e) => setUin(e.target.value)} />
            </label>
            <button className="primary" disabled={busy}>
              Save drone
            </button>
          </form>
        </div>
      )}
      {orgId && (
        <>
          <PilotProfiles
            key={orgId + userId}
            client={client}
            orgId={orgId}
            canAdmin={canAdmin}
            onLoaded={setPilots}
          />
          {flightStore && (
            <FlightWorkbench
              key={orgId + userId}
              store={flightStore}
              canEdit={canAdmin}
              drones={drones.map((d) => ({
                id: d.id,
                name: d.model_name,
                uin: d.uin_number ?? "",
              }))}
              batteries={batteries.map((b) => ({
                id: b.id,
                tag: b.asset_tag,
                chemistry: `${b.chemistry} ${b.cell_count}S`,
                capacityMah: b.capacity_mah,
                cycles: -1,
                health: null,
              }))}
              sessions={sessions.map((s) => ({
                id: s.id,
                batteryId: s.battery_id,
                droneId: s.drone_id,
                scannedAt: s.scanned_at,
              }))}
              company={activeOrg?.name ?? ""}
              logo={logo}
              pilots={pilots.filter((p) => p.org_id === orgId)}
            />
          )}
          <div className="actions no-print">
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void run(refresh)}
            >
              Refresh shared records
            </button>
            <button className="primary" onClick={() => window.print()}>
              Print / Save branded draft PDF
            </button>
          </div>
          <article className="report fleet-report">
            <div className="report-header">
              <div className="report-company">
                {logo && (
                  <Image
                    src={logo}
                    alt="Company logo"
                    className="company-logo"
                    width={120}
                    height={70}
                    unoptimized
                  />
                )}
                <div>
                  <h2>{activeOrg?.name}</h2>
                  <p>Flight and battery record pack</p>
                </div>
              </div>
              <div className="report-meta">
                DRAFT · {orgId}
                <br />
                Version 0.1
              </div>
            </div>
            <div className="report-warning">
              NOT AUDIT-READY · Preflight associations only. Flight telemetry,
              credentials, route evidence and reviewer approval remain pending.
            </div>
            <h3>Battery inventory</h3>
            <table>
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Capacity</th>
                  <th>Health</th>
                </tr>
              </thead>
              <tbody>
                {batteries.map((b) => (
                  <tr key={b.id}>
                    <td>{b.asset_tag}</td>
                    <td>{b.capacity_mah} mAh</td>
                    <td>Unassessed</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>Latest preflight records (up to 100)</h3>
            <table>
              <thead>
                <tr>
                  <th>Battery</th>
                  <th>Drone</th>
                  <th>Scan UTC</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {batteries.find((b) => b.id === s.battery_id)
                        ?.asset_tag ?? "Unknown"}
                    </td>
                    <td>
                      {drones.find((d) => d.id === s.drone_id)?.model_name ??
                        "Unknown"}
                    </td>
                    <td>{s.scanned_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!sessions.length && <p>No sessions recorded.</p>}
            <footer>
              Prepared with LogSkies · Preflight records do not establish
              regulatory compliance.
            </footer>
          </article>
        </>
      )}
    </main>
  );
}
