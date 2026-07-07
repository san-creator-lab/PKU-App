-- Supabase-compatibility harness for vanilla PostgreSQL.
--
-- Recreates just enough of a Supabase project (roles, auth schema,
-- auth.uid(), realtime publication, storage stubs, default grants) that the
-- REAL migrations in supabase/migrations/ apply completely unmodified and
-- RLS behaves exactly as it does behind PostgREST. Test-only — never ship
-- this to a real Supabase project (those pieces already exist there).

-- Client roles, as on Supabase ------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

grant usage on schema public to anon, authenticated, service_role;

-- Supabase grants table privileges to client roles by default; RLS is what
-- actually restricts rows. Mirror that for tables the migrations create.
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to anon, authenticated, service_role;

-- auth schema (GoTrue-managed on Supabase) ------------------------------------

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key,
  email text unique,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- auth.uid() exactly as Supabase defines it: the JWT `sub` claim that
-- PostgREST places in the request.jwt.claims GUC.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid;
$$;

grant execute on function auth.uid() to public;

-- Realtime publication (exists on every Supabase project) ---------------------

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

-- storage schema stub (Supabase Storage) --------------------------------------

create schema if not exists storage;
grant usage on schema storage to anon, authenticated, service_role;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text not null,
  owner uuid,
  created_at timestamptz not null default now()
);

alter table storage.objects enable row level security;
grant all on storage.buckets, storage.objects to anon, authenticated, service_role;

create or replace function storage.foldername(name text)
returns text[]
language sql
immutable
as $$
  select (string_to_array(name, '/'))[1 : array_upper(string_to_array(name, '/'), 1) - 1];
$$;
