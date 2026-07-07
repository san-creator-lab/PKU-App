-- Hero Fuel — core schema
-- Applies to a Supabase project (hosted or local). All tables are
-- family-scoped; RLS policies live in 20260707100002_rls.sql.

create extension if not exists pgcrypto;

-- Enums -----------------------------------------------------------------

create type public.user_role as enum ('hero', 'sidekick');
create type public.meal_type as enum ('breakfast', 'lunch', 'dinner', 'snack');
create type public.entry_source as enum ('manual', 'scan', 'library', 'favorite');

-- Tables ----------------------------------------------------------------

create table public.families (
  id uuid primary key default gen_random_uuid(),
  family_code varchar(6) not null unique check (family_code ~ '^[0-9]{6}$'),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid references public.families (id) on delete set null,
  display_name varchar(60) not null default 'Held',
  role public.user_role not null default 'sidekick',
  avatar_level int not null default 1 check (avatar_level >= 1),
  xp int not null default 0 check (xp >= 0),
  daily_protein_limit numeric(5, 2) not null default 8.0
    check (daily_protein_limit > 0),
  streak_current int not null default 0 check (streak_current >= 0),
  streak_best int not null default 0 check (streak_best >= 0),
  streak_shields int not null default 1 check (streak_shields >= 0),
  -- bookkeeping needed to compute streaks/shield refills deterministically
  streak_last_date date,
  shields_refilled_on date,
  language varchar(5) not null default 'nl',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_family_idx on public.profiles (family_id);

create table public.food_entries (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  logged_by uuid not null references public.profiles (id) on delete cascade,
  food_name varchar(120) not null default '',
  protein_grams numeric(6, 2) not null check (protein_grams >= 0),
  meal_type public.meal_type not null,
  source public.entry_source not null default 'manual',
  photo_url varchar,
  date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- idempotency key written by clients; lets the offline outbox retry
  -- safely and gives last-write-wins a stable identity across devices
  client_id uuid unique
);

create index food_entries_family_date_idx on public.food_entries (family_id, date);

create table public.custom_foods (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name varchar(120) not null,
  protein_per_100g numeric(6, 2) not null check (protein_per_100g >= 0),
  protein_per_serving numeric(6, 2) not null check (protein_per_serving >= 0),
  serving_description varchar(120) not null default '',
  category varchar(40) not null default 'Overig',
  emoji varchar(8),
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index custom_foods_family_idx on public.custom_foods (family_id);

-- Global base library, seeded via migration; read-only for clients.
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name varchar(120) not null,
  protein_per_100g numeric(6, 2) not null check (protein_per_100g >= 0),
  protein_per_serving numeric(6, 2) not null check (protein_per_serving >= 0),
  serving_description varchar(120) not null default '',
  category varchar(40) not null,
  emoji varchar(8)
);

create index foods_category_idx on public.foods (category);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  badge_type varchar(40) not null,
  earned_at timestamptz not null default now(),
  unique (profile_id, badge_type)
);

create table public.weekly_challenges (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  challenge_type varchar(40) not null,
  week_start date not null,
  completed boolean not null default false,
  completed_at timestamptz,
  unique (family_id, week_start)
);

-- updated_at maintenance ------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger food_entries_set_updated_at
  before update on public.food_entries
  for each row execute function public.set_updated_at();

create trigger custom_foods_set_updated_at
  before update on public.custom_foods
  for each row execute function public.set_updated_at();
