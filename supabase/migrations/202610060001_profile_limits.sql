-- Preserve existing companies/profiles; restrict new creation and retain edits.
create or replace function public.create_organization(org_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare new_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));
 if exists(select 1 from public.organization_members where user_id = auth.uid()) then
  raise exception 'Your company is already set up. Manage it in Profile.';
 end if;
 insert into public.organizations(name) values(trim(org_name)) returning id into new_id;
 insert into public.organization_members(org_id,user_id,role) values(new_id,auth.uid(),'owner');
 return new_id;
end; $$;

create function public.enforce_pilot_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 perform 1 from public.organizations where id = new.org_id for update;
 if tg_op = 'UPDATE' and new.org_id = old.org_id then return new; end if;
 if (select count(*) from public.pilot_profiles where org_id = new.org_id) >= 5 then
  raise exception 'A company can have a maximum of five pilot profiles.';
 end if;
 return new;
end; $$;
revoke all on function public.enforce_pilot_limit() from public, anon, authenticated;
create trigger pilot_profile_limit before insert or update of org_id on public.pilot_profiles
for each row execute function public.enforce_pilot_limit();
