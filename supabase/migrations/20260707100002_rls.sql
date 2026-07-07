-- Hero Fuel — row level security
-- Every family-scoped table: members of the same family can read/write
-- their family's rows; zero cross-family access. `foods` is read-only.

-- Helper functions (SECURITY DEFINER so policies on `profiles` never
-- recurse into themselves).

create or replace function public.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke execute on function public.current_family_id() from public, anon;
revoke execute on function public.current_user_role() from public, anon;
grant execute on function public.current_family_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;

-- families ---------------------------------------------------------------

alter table public.families enable row level security;

create policy "families: members can read their family"
  on public.families for select
  to authenticated
  using (id = public.current_family_id());

-- No insert/update/delete policies: families are created exclusively via
-- the SECURITY DEFINER function create_family().

-- profiles ---------------------------------------------------------------

alter table public.profiles enable row level security;

create policy "profiles: read own or family members"
  on public.profiles for select
  to authenticated
  using (id = auth.uid()
         or (family_id is not null and family_id = public.current_family_id()));

create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Sidekicks can update family members' profiles (adjust the hero's daily
-- limit, award XP/streaks when logging on the hero's behalf).
create policy "profiles: sidekicks update family members"
  on public.profiles for update
  to authenticated
  using (family_id is not null
         and family_id = public.current_family_id()
         and public.current_user_role() = 'sidekick')
  with check (family_id is not null
              and family_id = public.current_family_id());

-- No insert policy: profile rows are created by the on_auth_user_created
-- trigger (SECURITY DEFINER). No delete policy: handled via auth cascade.

-- food_entries -----------------------------------------------------------

alter table public.food_entries enable row level security;

create policy "food_entries: family members read"
  on public.food_entries for select
  to authenticated
  using (family_id = public.current_family_id());

create policy "food_entries: family members insert as themselves"
  on public.food_entries for insert
  to authenticated
  with check (family_id = public.current_family_id()
              and logged_by = auth.uid());

create policy "food_entries: family members update"
  on public.food_entries for update
  to authenticated
  using (family_id = public.current_family_id())
  with check (family_id = public.current_family_id());

create policy "food_entries: family members delete"
  on public.food_entries for delete
  to authenticated
  using (family_id = public.current_family_id());

-- custom_foods -----------------------------------------------------------

alter table public.custom_foods enable row level security;

create policy "custom_foods: family members read"
  on public.custom_foods for select
  to authenticated
  using (family_id = public.current_family_id());

create policy "custom_foods: family members insert"
  on public.custom_foods for insert
  to authenticated
  with check (family_id = public.current_family_id());

create policy "custom_foods: family members update"
  on public.custom_foods for update
  to authenticated
  using (family_id = public.current_family_id())
  with check (family_id = public.current_family_id());

create policy "custom_foods: family members delete"
  on public.custom_foods for delete
  to authenticated
  using (family_id = public.current_family_id());

-- foods (global base library) ---------------------------------------------

alter table public.foods enable row level security;

create policy "foods: authenticated read"
  on public.foods for select
  to authenticated
  using (true);

-- No write policies: seeded via migrations only.

-- badges -------------------------------------------------------------------

alter table public.badges enable row level security;

create policy "badges: family members read"
  on public.badges for select
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = badges.profile_id
      and p.family_id = public.current_family_id()
  ));

create policy "badges: family members award within family"
  on public.badges for insert
  to authenticated
  with check (exists (
    select 1 from public.profiles p
    where p.id = badges.profile_id
      and p.family_id = public.current_family_id()
  ));

-- weekly_challenges --------------------------------------------------------

alter table public.weekly_challenges enable row level security;

create policy "weekly_challenges: family members read"
  on public.weekly_challenges for select
  to authenticated
  using (family_id = public.current_family_id());

create policy "weekly_challenges: family members insert"
  on public.weekly_challenges for insert
  to authenticated
  with check (family_id = public.current_family_id());

create policy "weekly_challenges: family members update"
  on public.weekly_challenges for update
  to authenticated
  using (family_id = public.current_family_id())
  with check (family_id = public.current_family_id());
