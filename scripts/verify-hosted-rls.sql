-- Run as the SQL Editor's postgres role. All fixtures are rolled back.
-- No passwords, real-user data, or persistent memberships are changed.
begin;
select set_config('logskies.test_owner',gen_random_uuid()::text,true);
select set_config('logskies.test_pilot',gen_random_uuid()::text,true);
select set_config('logskies.test_outsider',gen_random_uuid()::text,true);
insert into auth.users(id) values
 (current_setting('logskies.test_owner')::uuid),
 (current_setting('logskies.test_pilot')::uuid),
 (current_setting('logskies.test_outsider')::uuid);
select set_config('request.jwt.claim.sub',current_setting('logskies.test_owner'),true);
set local role authenticated;
select set_config('logskies.test_org',public.create_organization('ROLLBACK SECURITY TEST')::text,true);
insert into public.batteries(org_id,asset_tag,chemistry,capacity_mah,cell_count)
values(current_setting('logskies.test_org')::uuid,'ROLLBACK-PACK','LiPo',16000,6);
reset role;
insert into public.organization_members(org_id,user_id,role)
values(current_setting('logskies.test_org')::uuid,current_setting('logskies.test_pilot')::uuid,'pilot');
select set_config('request.jwt.claim.sub',current_setting('logskies.test_pilot'),true);
set local role authenticated;
do $$
begin
 if (select count(*) from public.batteries where org_id=current_setting('logskies.test_org')::uuid) <> 1 then
  raise exception 'FAIL: pilot cannot read own fleet';
 end if;
 begin
  insert into public.batteries(org_id,asset_tag,chemistry,capacity_mah,cell_count)
  values(current_setting('logskies.test_org')::uuid,'DENIED-PACK','LiPo',1000,6);
  raise exception 'FAIL: pilot wrote fleet';
 exception when insufficient_privilege then null;
 end;
 update public.organization_members set role='owner'
 where org_id=current_setting('logskies.test_org')::uuid and user_id=auth.uid();
 if (select role from public.organization_members where org_id=current_setting('logskies.test_org')::uuid and user_id=auth.uid()) <> 'pilot' then
  raise exception 'FAIL: membership escalation';
 end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('logskies.test_outsider'),true);
set local role authenticated;
do $$
begin
 if exists(select 1 from public.organizations where id=current_setting('logskies.test_org')::uuid)
 or exists(select 1 from public.batteries where org_id=current_setting('logskies.test_org')::uuid)
 or exists(select 1 from public.organization_members where org_id=current_setting('logskies.test_org')::uuid) then
  raise exception 'FAIL: outsider read private organization data';
 end if;
 if exists(select 1 from storage.objects where bucket_id='company-logos') then
  raise exception 'FAIL: outsider read company logo objects';
 end if;
 begin
  insert into public.batteries(org_id,asset_tag,chemistry,capacity_mah,cell_count)
  values(current_setting('logskies.test_org')::uuid,'FOREIGN-PACK','LiPo',1000,6);
  raise exception 'FAIL: outsider wrote private fleet';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
select 'PASS: owner bootstrap, pilot read/write restrictions, membership escalation, outsider tenant and logo isolation. Fixtures rolled back.' as result;
