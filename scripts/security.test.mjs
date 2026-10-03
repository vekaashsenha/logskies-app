import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
test("PostgreSQL policies isolate tenants and reject unauthorized writes", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;
  create schema auth;create schema storage;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
  grant usage on schema public,auth,storage to authenticated,anon;
  grant execute on function auth.uid(),storage.foldername(text) to authenticated,anon;`);
    const migration = fs
      .readFileSync("supabase/migrations/202610030001_foundation.sql", "utf8")
      .replace("create extension if not exists pgcrypto;", "");
    await db.exec(migration);
    await db.exec(
      "grant select,insert,update,delete on all tables in schema public,storage to authenticated,anon;",
    );
    const owner = "11111111-1111-4111-8111-111111111111",
      pilot = "22222222-2222-4222-8222-222222222222",
      outsider = "33333333-3333-4333-8333-333333333333";
    await db.query("insert into auth.users values ($1),($2),($3)", [
      owner,
      pilot,
      outsider,
    ]);
    async function actor(user, role = "authenticated") {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        user,
      ]);
      await db.exec("set role " + role);
    }
    await actor(owner);
    const org = (
      await db.query("select public.create_organization('Fleet A') as id")
    ).rows[0].id;
    const bat = (
      await db.query(
        "insert into public.batteries(org_id,asset_tag,chemistry,capacity_mah,cell_count) values ($1,'PACK-A','LiPo',16000,6) returning id",
        [org],
      )
    ).rows[0].id;
    const drone = (
      await db.query(
        "insert into public.drones(org_id,model_name) values($1,'Drone A') returning id",
        [org],
      )
    ).rows[0].id;
    await actor(outsider);
    const other = (
      await db.query("select public.create_organization('Fleet B') as id")
    ).rows[0].id;
    const otherBattery = (
      await db.query(
        "insert into public.batteries(org_id,asset_tag,chemistry,capacity_mah,cell_count) values ($1,'PACK-B','LiPo',16000,6) returning id",
        [other],
      )
    ).rows[0].id;
    assert.equal(
      (await db.query("select * from public.batteries where org_id=$1", [org]))
        .rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select * from public.organization_members where org_id=$1",
          [org],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.query(
        "insert into public.batteries(org_id,asset_tag,chemistry,capacity_mah,cell_count) values($1,'EVIL','LiPo',1000,6)",
        [org],
      ),
      /row-level security/,
    );
    await db.exec("reset role");
    await db.query(
      "insert into public.organization_members(org_id,user_id,role) values($1,$2,'pilot')",
      [org, pilot],
    );
    await actor(pilot);
    assert.equal(
      (await db.query("select * from public.batteries")).rows.length,
      1,
    );
    await assert.rejects(
      db.query(
        "insert into public.batteries(org_id,asset_tag,chemistry,capacity_mah,cell_count) values($1,'NEW','LiPo',1000,6)",
        [org],
      ),
      /row-level security/,
    );
    await db.query(
      "update public.batteries set asset_tag='HACKED' where id=$1",
      [bat],
    );
    assert.equal(
      (
        await db.query("select asset_tag from public.batteries where id=$1", [
          bat,
        ])
      ).rows[0].asset_tag,
      "PACK-A",
    );
    await db.query(
      "update public.organization_members set role='owner' where org_id=$1 and user_id=$2",
      [org, pilot],
    );
    assert.equal(
      (
        await db.query(
          "select role from public.organization_members where user_id=$1",
          [pilot],
        )
      ).rows[0].role,
      "pilot",
    );
    const event = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    await db.query(
      "insert into public.preflight_sessions(org_id,battery_id,drone_id,client_event_id,scanned_at) values($1,$2,$3,$4,now())",
      [org, bat, drone, event],
    );
    await assert.rejects(
      db.query(
        "insert into public.preflight_sessions(org_id,battery_id,drone_id,client_event_id,scanned_at) values($1,$2,$3,gen_random_uuid(),now())",
        [org, otherBattery, drone],
      ),
      /foreign key/,
    );
    await assert.rejects(
      db.query(
        "insert into public.flight_logs(org_id,drone_id,takeoff_at,landing_at) values($1,$2,now(),now())",
        [org, drone],
      ),
      /row-level security/,
    );
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values('company-logos',$1)",
        [org + "/logo.png"],
      ),
      /row-level security/,
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values('flight-logs',$1)",
      [org + "/flight.bin"],
    );
    await assert.rejects(
      db.query(
        "insert into storage.objects(bucket_id,name) values('flight-logs',$1)",
        [other + "/flight.bin"],
      ),
      /row-level security/,
    );
    await actor(owner);
    await db.query(
      "insert into storage.objects(bucket_id,name) values('company-logos',$1)",
      [org + "/logo.png"],
    );
    await actor(outsider);
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
    );
    await actor("", "anon");
    assert.equal(
      (await db.query("select * from public.batteries")).rows.length,
      0,
    );
    await assert.rejects(
      db.query("select public.create_organization('Anonymous')"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
