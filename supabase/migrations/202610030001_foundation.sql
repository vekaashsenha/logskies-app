-- Foundation migration. Run in a fresh Supabase project after review.
-- Hosted migration execution and isolation tests have not yet been performed.
create extension if not exists pgcrypto;
create table public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120),
 logo_storage_path text, created_at timestamptz not null default now()
);
create table public.organization_members (
 org_id uuid not null references public.organizations on delete cascade,
 user_id uuid not null references auth.users on delete cascade,
 role text not null check(role in ('owner','admin','pilot')), created_at timestamptz not null default now(),
 primary key(org_id,user_id)
);
create index organization_members_user_idx on public.organization_members(user_id);
create function public.is_org_member(target_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.organization_members m where m.org_id = target_org and m.user_id = auth.uid());
$$;
create function public.is_org_admin(target_org uuid) returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.organization_members m where m.org_id = target_org and m.user_id = auth.uid() and m.role in ('owner','admin'));
$$;
revoke all on function public.is_org_member(uuid), public.is_org_admin(uuid) from public, anon;
grant execute on function public.is_org_member(uuid), public.is_org_admin(uuid) to authenticated;
create function public.create_organization(org_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 insert into public.organizations(name) values(trim(org_name)) returning id into new_id;
 insert into public.organization_members(org_id,user_id,role) values(new_id,auth.uid(),'owner');
 return new_id;
end;
$$;
revoke all on function public.create_organization(text) from public, anon;
grant execute on function public.create_organization(text) to authenticated;
create table public.batteries (
 id uuid primary key default gen_random_uuid(), org_id uuid not null references public.organizations,
 asset_tag text not null, chemistry text not null, capacity_mah integer not null check(capacity_mah > 0),
 cell_count integer not null check(cell_count between 1 and 32), created_at timestamptz not null default now(),
 unique(org_id,asset_tag), unique(org_id,id)
);
create table public.drones (
 id uuid primary key default gen_random_uuid(), org_id uuid not null references public.organizations,
 model_name text not null, uin_number text, autopilot text not null default 'ArduPilot',
 created_at timestamptz not null default now(), unique(org_id,id), unique(org_id,uin_number)
);
create table public.pilot_profiles (
 id uuid primary key default gen_random_uuid(), org_id uuid not null references public.organizations,
 user_id uuid references auth.users, display_name text not null, rpc_number text, rpc_expires_on date,
 created_at timestamptz not null default now(), unique(org_id,id)
);
create table public.preflight_sessions (
 id uuid primary key default gen_random_uuid(), org_id uuid not null references public.organizations,
 battery_id uuid not null, drone_id uuid not null, created_by uuid not null default auth.uid() references auth.users,
 client_event_id uuid not null, scanned_at timestamptz not null, received_at timestamptz not null default now(),
 foreign key(org_id,battery_id) references public.batteries(org_id,id),
 foreign key(org_id,drone_id) references public.drones(org_id,id), unique(org_id,client_event_id), unique(org_id,id)
);
create index session_match_idx on public.preflight_sessions(org_id,drone_id,scanned_at);
create table public.flight_logs (
 id uuid primary key default gen_random_uuid(), org_id uuid not null references public.organizations,
 drone_id uuid not null, battery_id uuid, pilot_id uuid,
 takeoff_at timestamptz not null, landing_at timestamptz not null check(landing_at >= takeoff_at),
 takeoff_latitude numeric(9,6) check(takeoff_latitude between -90 and 90),
 takeoff_longitude numeric(9,6) check(takeoff_longitude between -180 and 180),
 landing_latitude numeric(9,6) check(landing_latitude between -90 and 90),
 landing_longitude numeric(9,6) check(landing_longitude between -180 and 180),
 max_altitude_agl_m numeric, purpose text, incidents text,
 drone_uin_snapshot text, pilot_rpc_snapshot text, raw_log_storage_path text,
 parser_version text, evidence_status text not null default 'pending' check(evidence_status in ('pending','needs_review','reviewed')),
 created_at timestamptz not null default now(),
 foreign key(org_id,drone_id) references public.drones(org_id,id),
 foreign key(org_id,battery_id) references public.batteries(org_id,id),
 foreign key(org_id,pilot_id) references public.pilot_profiles(org_id,id), unique(org_id,id)
);
create table public.battery_observations (
 id uuid primary key default gen_random_uuid(), org_id uuid not null references public.organizations,
 battery_id uuid not null, flight_id uuid not null, health_estimate numeric check(health_estimate between 0 and 100),
 consumed_mah numeric check(consumed_mah >= 0), resistance_ohms numeric check(resistance_ohms >= 0),
 scoring_version text not null, evidence jsonb not null default '{}', created_at timestamptz not null default now(),
 foreign key(org_id,battery_id) references public.batteries(org_id,id),
 foreign key(org_id,flight_id) references public.flight_logs(org_id,id)
);
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.batteries enable row level security;
alter table public.drones enable row level security;
alter table public.pilot_profiles enable row level security;
alter table public.preflight_sessions enable row level security;
alter table public.flight_logs enable row level security;
alter table public.battery_observations enable row level security;
create policy org_read on public.organizations for select to authenticated using(public.is_org_member(id));
create policy org_update on public.organizations for update to authenticated using(public.is_org_admin(id)) with check(public.is_org_admin(id));
create policy member_read on public.organization_members for select to authenticated using(public.is_org_member(org_id));
-- Membership changes require a privileged, validated invitation flow. No client mutation policy.
create policy battery_read on public.batteries for select to authenticated using(public.is_org_member(org_id));
create policy battery_insert on public.batteries for insert to authenticated with check(public.is_org_admin(org_id));
create policy battery_update on public.batteries for update to authenticated using(public.is_org_admin(org_id)) with check(public.is_org_admin(org_id));
create policy drone_read on public.drones for select to authenticated using(public.is_org_member(org_id));
create policy drone_insert on public.drones for insert to authenticated with check(public.is_org_admin(org_id));
create policy drone_update on public.drones for update to authenticated using(public.is_org_admin(org_id)) with check(public.is_org_admin(org_id));
create policy pilot_read on public.pilot_profiles for select to authenticated using(public.is_org_member(org_id));
create policy pilot_insert on public.pilot_profiles for insert to authenticated with check(public.is_org_admin(org_id));
create policy pilot_update on public.pilot_profiles for update to authenticated using(public.is_org_admin(org_id)) with check(public.is_org_admin(org_id));
create policy session_read on public.preflight_sessions for select to authenticated using(public.is_org_member(org_id));
create policy session_insert on public.preflight_sessions for insert to authenticated with check(public.is_org_member(org_id) and created_by = auth.uid());
-- Computed flight/evidence records are written by the trusted processing service, not clients.
create policy flight_read on public.flight_logs for select to authenticated using(public.is_org_member(org_id));
create policy observation_read on public.battery_observations for select to authenticated using(public.is_org_member(org_id));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('company-logos','company-logos',false,1048576,array['image/png','image/jpeg','image/webp']),
 ('flight-logs','flight-logs',false,209715200,null);
-- Object names must start with the organization UUID. No anonymous bucket access.
create policy org_file_read on storage.objects for select to authenticated using(
 bucket_id in ('company-logos','flight-logs') and (storage.foldername(name))[1] in
 (select org_id::text from public.organization_members where user_id = auth.uid())
);
create policy log_upload on storage.objects for insert to authenticated with check(
 bucket_id = 'flight-logs' and (storage.foldername(name))[1] in
 (select org_id::text from public.organization_members where user_id = auth.uid())
);
create policy logo_upload on storage.objects for insert to authenticated with check(
 bucket_id = 'company-logos' and (storage.foldername(name))[1] in
 (select org_id::text from public.organization_members where user_id = auth.uid() and role in ('owner','admin'))
);
create policy logo_update on storage.objects for update to authenticated using(
 bucket_id = 'company-logos' and (storage.foldername(name))[1] in
 (select org_id::text from public.organization_members where user_id = auth.uid() and role in ('owner','admin'))
) with check(
 bucket_id = 'company-logos' and (storage.foldername(name))[1] in
 (select org_id::text from public.organization_members where user_id = auth.uid() and role in ('owner','admin'))
);
