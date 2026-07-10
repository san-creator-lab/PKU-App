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
--
-- Wrapped in exception-safe blocks: storage.objects ownership varies across
-- hosted Supabase projects, and photo upload degrades gracefully in the app
-- (uploadLabelPhoto returns null), so a permission hiccup here must never
-- abort the schema migration. A NOTICE is raised instead; the policies can
-- then be added once via Dashboard -> Storage -> Policies.
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('label-photos', 'label-photos', false)
  on conflict (id) do nothing;
exception when insufficient_privilege or undefined_table then
  raise notice 'label-photos bucket not created (%). Create it in Dashboard -> Storage.', sqlerrm;
end $$;

do $$
begin
  execute $pol$
    create policy "label photos: family members read"
      on storage.objects for select
      to authenticated
      using (
        bucket_id = 'label-photos'
        and (storage.foldername(name))[1] = public.current_family_id()::text
      )
  $pol$;
  execute $pol$
    create policy "label photos: family members upload"
      on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'label-photos'
        and (storage.foldername(name))[1] = public.current_family_id()::text
      )
  $pol$;
  execute $pol$
    create policy "label photos: family members delete"
      on storage.objects for delete
      to authenticated
      using (
        bucket_id = 'label-photos'
        and (storage.foldername(name))[1] = public.current_family_id()::text
      )
  $pol$;
exception when insufficient_privilege or undefined_table or duplicate_object then
  raise notice 'storage policies skipped (%). Add them via Dashboard -> Storage -> Policies.', sqlerrm;
end $$;
