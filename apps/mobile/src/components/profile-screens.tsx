import React, { useEffect, useState } from "react";
import { router } from "expo-router";
import { connectedClient, useWorkspace } from "../../ConnectedApp";
import {
  listPilots,
  savePilot,
  renameOrg,
  errorMessage,
  type PilotProfile,
} from "@logskies/api";
import { Screen, Card, Heading, Muted, Field, Button, Row } from "./field-ui";

export function ProfilesScreen() {
  const w = useWorkspace();
  return <Profiles key={w.orgId + w.userId} />;
}
function Profiles() {
  const w = useWorkspace();
  const [pilots, setPilots] = useState<PilotProfile[]>([]);
  const [admin, setAdmin] = useState(false),
    [loaded, setLoaded] = useState(false);
  const [company, setCompany] = useState(w.org?.name ?? "");
  const [notice, setNotice] = useState("");
  const [id, setId] = useState<string>(),
    [name, setName] = useState(""),
    [rpc, setRpc] = useState(""),
    [expiry, setExpiry] = useState("");
  useEffect(() => {
    let active = true;
    const client = connectedClient;
    if (!client || !w.orgId || !w.userId) return;
    void (async () => {
      const [items, membership] = await Promise.all([
        listPilots(client, w.orgId),
        client
          .from("organization_members")
          .select("role")
          .eq("org_id", w.orgId)
          .eq("user_id", w.userId)
          .single(),
      ]);
      if (membership.error) throw membership.error;
      if (active) {
        setPilots(items);
        setAdmin(["owner", "admin"].includes(membership.data.role));
        setLoaded(true);
      }
    })().catch((error) => {
      if (active) setNotice(errorMessage(error));
    });
    return () => {
      active = false;
    };
    // The screen remounts when account or organization changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function clear() {
    setId(undefined);
    setName("");
    setRpc("");
    setExpiry("");
  }
  return (
    <Screen
      title="Team profiles"
      subtitle="Company identity and pilot credentials."
      action="Back"
      onAction={() => router.back()}
    >
      {!!notice && <Muted>{notice}</Muted>}
      <Card>
        <Heading>Company profile</Heading>
        <Muted>{w.org?.name ?? "Select an organization in More."}</Muted>
        {admin && (
          <>
            <Field
              label="Company / operator display name"
              maxLength={120}
              value={company}
              onChangeText={setCompany}
            />
            <Button
              title="Save company name"
              disabled={w.busy || !company.trim()}
              onPress={() =>
                void w.run(async () => {
                  if (!connectedClient) return;
                  await renameOrg(connectedClient, w.orgId, company);
                  await w.reloadOrgs();
                  setNotice("Company name saved.");
                })
              }
            />
          </>
        )}
        <Button
          secondary
          title="Manage report logo on web"
          onPress={() => void w.openWeb()}
        />
        <Muted>
          Company address, GST and contact fields are not stored in this first
          profile version.
        </Muted>
      </Card>
      <Card>
        <Heading>Pilot profiles</Heading>
        <Muted>
          Entered RPC details need certificate verification. A pilot record does
          not create an account or send an invitation.
        </Muted>
        {!loaded && (
          <Muted>
            {w.preview
              ? "Profile editing requires your connected account."
              : "Loading profiles…"}
          </Muted>
        )}
        {loaded && !pilots.length && (
          <Muted>No pilots yet. Add your first pilot below.</Muted>
        )}
        {pilots.map((p) => (
          <Row
            key={p.id}
            title={p.display_name}
            subtitle={`${p.rpc_number ?? "RPC not recorded"} · ${p.rpc_expires_on ? "Expires " + p.rpc_expires_on : "Expiry not recorded"}`}
            disabled={!admin || w.busy}
            icon="person-outline"
            onPress={() => {
              setId(p.id);
              setName(p.display_name);
              setRpc(p.rpc_number ?? "");
              setExpiry(p.rpc_expires_on ?? "");
            }}
          />
        ))}
        {loaded && !admin && (
          <Muted>
            Only owners and admins can edit company and pilot records.
          </Muted>
        )}
      </Card>
      {admin && (
        <Card>
          <Heading>{id ? "Edit pilot" : "Add pilot"}</Heading>
          <Field
            label="Pilot name"
            maxLength={120}
            value={name}
            onChangeText={setName}
          />
          <Field
            label="RPC number (optional during setup)"
            maxLength={120}
            value={rpc}
            onChangeText={setRpc}
            autoCapitalize="characters"
          />
          <Field
            label="RPC expiry — YYYY-MM-DD"
            maxLength={10}
            placeholder="2030-12-31"
            value={expiry}
            onChangeText={setExpiry}
          />
          <Button
            title="Save pilot profile"
            disabled={w.busy || !name.trim()}
            onPress={() =>
              void w.run(async () => {
                if (!connectedClient) return;
                await savePilot(connectedClient, w.orgId, {
                  id,
                  display_name: name,
                  rpc_number: rpc,
                  rpc_expires_on: expiry,
                });
                setPilots(await listPilots(connectedClient, w.orgId));
                clear();
                setNotice("Pilot profile saved.");
              })
            }
          />
          {id && (
            <Button
              secondary
              title="Cancel editing"
              disabled={w.busy}
              onPress={clear}
            />
          )}
        </Card>
      )}
    </Screen>
  );
}
