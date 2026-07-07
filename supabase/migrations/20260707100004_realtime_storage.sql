-- Hero Fuel — realtime publication + storage bucket for label photos.

-- Realtime: the app subscribes to postgres_changes on these tables so a
-- meal logged on one device animates every other device within ~1s.
alter publication supabase_realtime add table public.food_entries;
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.badges;

-- Full row payloads on UPDATE/DELETE events.
alter table public.food_entries replica identity full;
alter table public.profiles replica identity full;
alter table public.badges replica identity full;

-- Storage: private bucket for nutrition-label photos. Object paths are
-- `<family_id>/<uuid>.jpg`, and policies scope access to the caller's family.
insert into storage.buckets (id, name, public)
values ('label-photos', 'label-photos', false)
on conflict (id) do nothing;

create policy "label photos: family members read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'label-photos'
    and (storage.foldername(name))[1] = public.current_family_id()::text
  );

create policy "label photos: family members upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'label-photos'
    and (storage.foldername(name))[1] = public.current_family_id()::text
  );

create policy "label photos: family members delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'label-photos'
    and (storage.foldername(name))[1] = public.current_family_id()::text
  );
