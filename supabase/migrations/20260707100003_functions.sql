-- Hero Fuel — auth/profile plumbing and the family-code join flow.
-- A joining device has an auth user before it belongs to a family, so both
-- create_family() and join_family() are SECURITY DEFINER: they mutate rows
-- the caller cannot reach through RLS, and they never loosen the policies.

-- Create a profile row for every new auth user. Signup metadata may carry
-- display_name and role ('hero' devices are created through the family-code
-- join flow).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, role, language)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 'Held'),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'sidekick'),
    coalesce(nullif(new.raw_user_meta_data ->> 'language', ''), 'nl')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create a family with a unique 6-digit code and put the caller in it.
create or replace function public.create_family()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code varchar(6);
  new_family_id uuid;
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'not_authenticated';
  end if;

  if (select family_id from public.profiles where id = caller) is not null then
    raise exception 'already_in_family';
  end if;

  loop
    new_code := lpad((floor(random() * 900000) + 100000)::int::text, 6, '0');
    begin
      insert into public.families (family_code)
      values (new_code)
      returning id into new_family_id;
      exit;
    exception when unique_violation then
      -- extremely unlikely collision: try another code
    end;
  end loop;

  update public.profiles set family_id = new_family_id where id = caller;

  return json_build_object('family_id', new_family_id, 'family_code', new_code);
end;
$$;

-- Join an existing family with its 6-digit code.
create or replace function public.join_family(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_family uuid;
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'not_authenticated';
  end if;

  select id into target_family
  from public.families
  where family_code = trim(code);

  if target_family is null then
    raise exception 'invalid_family_code';
  end if;

  if (select family_id from public.profiles where id = caller) is not null then
    raise exception 'already_in_family';
  end if;

  update public.profiles set family_id = target_family where id = caller;

  return target_family;
end;
$$;

revoke execute on function public.create_family() from public, anon;
revoke execute on function public.join_family(text) from public, anon;
grant execute on function public.create_family() to authenticated;
grant execute on function public.join_family(text) to authenticated;
