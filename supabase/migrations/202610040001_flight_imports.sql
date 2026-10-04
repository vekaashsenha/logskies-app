-- User-supplied telemetry drafts are separate from trusted flight_logs.
create table public.flight_imports (
 id uuid primary key,
 org_id uuid not null references public.organizations(id),
 drone_id uuid not null,
 battery_id uuid,
 source_hash text not null check(source_hash ~ '^[a-f0-9]{64}$'),
 interval_index integer not null check(interval_index >= 0),
 record jsonb not null check(jsonb_typeof(record) = 'object'),
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(org_id,drone_id) references public.drones(org_id,id),
 foreign key(org_id,battery_id) references public.batteries(org_id,id),
 unique(org_id, source_hash, interval_index)
);
alter table public.flight_imports enable row level security;
create policy flight_import_read on public.flight_imports for select to authenticated using(public.is_org_member(org_id));
grant select on public.flight_imports to authenticated;
revoke insert, update, delete on public.flight_imports from authenticated, anon;
create function public.save_flight_imports(target_org uuid, records jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
 if not public.is_org_admin(target_org) then raise exception 'Organization admin required'; end if;
 if records is null or jsonb_typeof(records) is distinct from 'array' then raise exception 'Invalid import batch'; end if;
 if jsonb_array_length(records) < 1 or jsonb_array_length(records) > 100 then raise exception 'Invalid import batch'; end if;
 for r in select value from jsonb_array_elements(records) loop
  if octet_length(r::text) > 20000000 then raise exception 'Record too large'; end if;
  insert into public.flight_imports(id,org_id,drone_id,battery_id,source_hash,interval_index,record)
  values((r->>'id')::uuid,target_org,(r->>'droneId')::uuid,nullif(r->>'batteryId','')::uuid,r->>'sourceHash',(r->'flight'->>'index')::integer,r)
  on conflict(id) do update set battery_id=excluded.battery_id,record=excluded.record,updated_at=now()
  where flight_imports.org_id=target_org and flight_imports.drone_id=excluded.drone_id and flight_imports.source_hash=excluded.source_hash and flight_imports.interval_index=excluded.interval_index;
  if not found then raise exception 'Import identity mismatch'; end if;
 end loop;
end;
$$;
revoke all on function public.save_flight_imports(uuid,jsonb) from public, anon;
grant execute on function public.save_flight_imports(uuid,jsonb) to authenticated;
