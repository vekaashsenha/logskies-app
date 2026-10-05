"use client";
import { useEffect, useState } from "react";
import {
  listPilots,
  savePilot,
  errorMessage,
  type PilotProfile,
  type SupabaseClient,
} from "@logskies/api";
export default function PilotProfiles({
  client,
  orgId,
  canAdmin,
  onLoaded,
}: {
  client: SupabaseClient;
  orgId: string;
  canAdmin: boolean;
  onLoaded: (pilots: PilotProfile[]) => void;
}) {
  const [pilots, setPilots] = useState<PilotProfile[]>([]);
  const [name, setName] = useState(""),
    [rpc, setRpc] = useState(""),
    [expiry, setExpiry] = useState(""),
    [id, setId] = useState<string>();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    listPilots(client, orgId)
      .then((items) => {
        if (active) {
          setPilots(items);
          onLoaded(items);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (active) setMessage(errorMessage(e));
      });
    return () => {
      active = false;
    };
  }, [client, orgId, onLoaded]);
  function clear() {
    setId(undefined);
    setName("");
    setRpc("");
    setExpiry("");
  }
  return (
    <section className="panel form-grid no-print" id="pilot-profiles">
      <h2>Pilot profiles</h2>
      <p className="muted">
        Shared pilot names and RPC details. Entered credentials require
        verification against the original certificate. Adding a pilot does not
        invite them or create a login.
      </p>
      {message && <p role="status">{message}</p>}
      {!loaded && !message && <p>Loading pilots…</p>}
      {loaded && !pilots.length && <p>No pilot profiles yet.</p>}
      {pilots.map((p) => (
        <div key={p.id} className="form-row">
          <div>
            <strong>{p.display_name}</strong>
            <p>
              {p.rpc_number || "RPC not recorded"} ·{" "}
              {p.rpc_expires_on
                ? `Expires ${p.rpc_expires_on}`
                : "Expiry not recorded"}
            </p>
          </div>
          {canAdmin && (
            <button
              className="secondary"
              disabled={busy}
              onClick={() => {
                setId(p.id);
                setName(p.display_name);
                setRpc(p.rpc_number ?? "");
                setExpiry(p.rpc_expires_on ?? "");
              }}
            >
              Edit {p.display_name}
            </button>
          )}
        </div>
      ))}
      {canAdmin ? (
        <form
          className="form-grid"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setMessage("");
            try {
              await savePilot(client, orgId, {
                id,
                display_name: name,
                rpc_number: rpc,
                rpc_expires_on: expiry,
              });
              const items = await listPilots(client, orgId);
              setPilots(items);
              onLoaded(items);
              setLoaded(true);
              clear();
              setMessage("Pilot profile saved.");
            } catch (e) {
              setMessage(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3>{id ? "Edit pilot" : "Add pilot"}</h3>
          <label>
            Pilot name
            <input
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            RPC number (optional during setup)
            <input
              maxLength={120}
              value={rpc}
              onChange={(e) => setRpc(e.target.value)}
            />
          </label>
          <label>
            RPC expiry date
            <input
              type="date"
              value={expiry}
              onChange={(e) => setExpiry(e.target.value)}
            />
          </label>
          <button className="primary" disabled={busy || !loaded}>
            Save pilot profile
          </button>
          {id && (
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={clear}
            >
              Cancel editing
            </button>
          )}
        </form>
      ) : (
        <p className="muted">
          Ask an organization owner or admin to update pilot records.
        </p>
      )}
    </section>
  );
}
