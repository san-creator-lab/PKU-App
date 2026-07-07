-- RLS proof for Hero Fuel.
--
-- Simulates exactly what PostgREST does per request: SET LOCAL ROLE + the
-- request.jwt.claims GUC that auth.uid() reads. Two families are created;
-- the proof shows a member of family B cannot read or write family A's rows,
-- that the 6-digit join flow works for a fresh account, and that the seeded
-- foods library is read-only. Every expectation is asserted — any deviation
-- aborts the script with a non-zero exit code.

\set ON_ERROR_STOP on

-- Scratch table to pass values between transactions (test plumbing only).
create table if not exists public._test_state (key text primary key, value text);
grant all on public._test_state to public;

\echo ''
\echo '=== 0. Seed auth users (as the auth service would) ==='

insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'anna@example.com',
   '{"display_name": "Anna", "role": "sidekick"}'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'max@example.com',
   '{"display_name": "Max", "role": "hero"}'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'bram@example.com',
   '{"display_name": "Bram", "role": "sidekick"}');

-- handle_new_user trigger must have created one profile per user
do $$
declare n int;
begin
  select count(*) into n from public.profiles;
  if n <> 3 then raise exception 'expected 3 profiles from trigger, got %', n; end if;
  raise notice 'OK: on_auth_user_created trigger created 3 profiles';
end $$;

\echo ''
\echo '=== 1. Anna (family A) creates a family and logs meals ==='

begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", "role": "authenticated"}';

insert into public._test_state (key, value)
select 'family_a_' || v.k, fam.j ->> v.k
from (select public.create_family() as j) fam,
     (values ('family_id'), ('family_code')) v (k);

insert into public.food_entries (family_id, logged_by, food_name, protein_grams, meal_type, source)
values
  (public.current_family_id(), auth.uid(), 'Appel', 0.5, 'snack', 'library'),
  (public.current_family_id(), auth.uid(), 'Eiwitarm brood', 0.2, 'breakfast', 'library');

insert into public.custom_foods (family_id, name, protein_per_100g, protein_per_serving, serving_description, category)
values (public.current_family_id(), 'Oma''s appeltaart (eiwitarm)', 0.9, 0.7, '1 punt (80 g)', 'Snacks');

commit;

\echo ''
\echo '=== 2. Bram creates a SECOND family (family B) and logs a meal ==='

begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1", "role": "authenticated"}';

insert into public._test_state (key, value)
select 'family_b_' || v.k, fam.j ->> v.k
from (select public.create_family() as j) fam,
     (values ('family_id'), ('family_code')) v (k);

insert into public.food_entries (family_id, logged_by, food_name, protein_grams, meal_type)
values (public.current_family_id(), auth.uid(), 'Banaan', 1.3, 'snack');

commit;

\echo ''
\echo '=== 3. THE PROOF: Bram (family B) cannot touch family A ==='

begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1", "role": "authenticated"}';

\echo ''
\echo '--- 3a. SELECT family A''s food entries -> must return 0 rows ---'
select id, food_name, protein_grams
from public.food_entries
where family_id = (select value::uuid from public._test_state where key = 'family_a_family_id');

do $$
declare n int;
begin
  select count(*) into n from public.food_entries
  where family_id = (select value::uuid from public._test_state where key = 'family_a_family_id');
  if n <> 0 then raise exception 'RLS BREACH: family B read % family-A entries', n; end if;

  select count(*) into n from public.food_entries;
  if n <> 1 then raise exception 'expected exactly own 1 entry, got %', n; end if;
  raise notice 'OK: cross-family SELECT on food_entries returns 0 rows (own family: 1 row)';
end $$;

\echo ''
\echo '--- 3b. INSERT into family A -> must be DENIED by RLS with-check ---'
do $$
begin
  insert into public.food_entries (family_id, logged_by, food_name, protein_grams, meal_type)
  values ((select value::uuid from public._test_state where key = 'family_a_family_id'),
          auth.uid(), 'Smokkelpoging', 5.0, 'snack');
  raise exception 'RLS BREACH: family B inserted into family A';
exception when insufficient_privilege then
  raise notice 'OK: INSERT denied -> %', sqlerrm;
end $$;

\echo ''
\echo '--- 3c. UPDATE family A''s entries -> must affect 0 rows ---'
update public.food_entries set protein_grams = 99
where family_id = (select value::uuid from public._test_state where key = 'family_a_family_id');

do $$
declare n int;
begin
  update public.food_entries set protein_grams = 99
  where family_id = (select value::uuid from public._test_state where key = 'family_a_family_id');
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS BREACH: family B updated % family-A rows', n; end if;
  raise notice 'OK: UPDATE touched 0 rows';
end $$;

\echo ''
\echo '--- 3d. DELETE family A''s entries -> must affect 0 rows ---'
do $$
declare n int;
begin
  delete from public.food_entries
  where family_id = (select value::uuid from public._test_state where key = 'family_a_family_id');
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS BREACH: family B deleted % family-A rows', n; end if;
  raise notice 'OK: DELETE touched 0 rows';
end $$;

\echo ''
\echo '--- 3e. families / profiles / custom_foods of family A -> invisible ---'
do $$
declare n int;
begin
  select count(*) into n from public.families
  where id = (select value::uuid from public._test_state where key = 'family_a_family_id');
  if n <> 0 then raise exception 'RLS BREACH: family B can see family A row'; end if;

  select count(*) into n from public.profiles where display_name in ('Anna', 'Max');
  if n <> 0 then raise exception 'RLS BREACH: family B can see family A profiles'; end if;

  select count(*) into n from public.custom_foods;
  if n <> 0 then raise exception 'RLS BREACH: family B sees % foreign custom foods', n; end if;

  raise notice 'OK: families, profiles and custom_foods are fully isolated';
end $$;

\echo ''
\echo '--- 3f. Award a badge to a family-A profile -> must be DENIED ---'
do $$
begin
  insert into public.badges (profile_id, badge_type)
  values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'hacked');
  raise exception 'RLS BREACH: family B awarded a badge across families';
exception when insufficient_privilege then
  raise notice 'OK: cross-family badge INSERT denied -> %', sqlerrm;
end $$;

commit;

\echo ''
\echo '=== 4. Family-code join: fresh hero device joins family A ==='

begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2", "role": "authenticated"}';

do $$
begin
  perform public.join_family('000000');
  raise exception 'join_family accepted an invalid code';
exception when raise_exception then
  if sqlerrm <> 'invalid_family_code' then raise; end if;
  raise notice 'OK: invalid code rejected -> %', sqlerrm;
end $$;

select public.join_family((select value from public._test_state where key = 'family_a_family_code'))
       is not null as joined_family_a;

do $$
declare n int;
begin
  select count(*) into n from public.food_entries;
  if n <> 2 then raise exception 'hero should see 2 family-A entries after join, got %', n; end if;
  select count(*) into n from public.profiles;
  if n <> 2 then raise exception 'hero should see 2 family-A profiles, got %', n; end if;
  raise notice 'OK: after join the hero device sees family A''s data';
end $$;

commit;

\echo ''
\echo '=== 5. foods base library: readable, never writable ==='

begin;
set local role authenticated;
set local "request.jwt.claims" = '{"sub": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1", "role": "authenticated"}';

do $$
declare n int;
begin
  select count(*) into n from public.foods;
  if n < 50 then raise exception 'expected >= 50 seeded foods, got %', n; end if;
  raise notice 'OK: % seeded foods readable by authenticated users', n;
end $$;

do $$
begin
  insert into public.foods (name, protein_per_100g, protein_per_serving, category)
  values ('Nepvoedsel', 1, 1, 'Snacks');
  raise exception 'RLS BREACH: client wrote to the global foods table';
exception when insufficient_privilege then
  raise notice 'OK: client INSERT into foods denied -> %', sqlerrm;
end $$;

commit;

\echo ''
\echo '=== 6. anon role: no data, no writes, no join RPC ==='

begin;
set local role anon;

do $$
declare n int;
begin
  select count(*) into n from public.food_entries;
  if n <> 0 then raise exception 'RLS BREACH: anon sees % food entries', n; end if;
  select count(*) into n from public.foods;
  if n <> 0 then raise exception 'RLS BREACH: anon sees the foods library'; end if;
  raise notice 'OK: anon sees 0 rows everywhere';
end $$;

do $$
begin
  perform public.join_family('123456');
  raise exception 'BREACH: anon may call join_family';
exception when insufficient_privilege then
  raise notice 'OK: anon cannot execute join_family -> %', sqlerrm;
end $$;

commit;

\echo ''
\echo '=== 7. Realtime publication + storage policies present ==='

do $$
declare n int;
begin
  select count(*) into n from pg_publication_tables
  where pubname = 'supabase_realtime'
    and tablename in ('food_entries', 'profiles', 'badges');
  if n <> 3 then raise exception 'expected 3 tables in supabase_realtime, got %', n; end if;

  select count(*) into n from pg_policies
  where schemaname = 'storage' and tablename = 'objects';
  if n < 3 then raise exception 'expected >= 3 storage.objects policies, got %', n; end if;

  raise notice 'OK: realtime publication covers food_entries/profiles/badges; storage policies in place';
end $$;

drop table public._test_state;

\echo ''
\echo 'ALL RLS ASSERTIONS PASSED'
