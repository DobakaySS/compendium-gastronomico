-- =============================================================
-- Imagens de receitas — bucket público no Supabase Storage.
-- Executar no SQL Editor do Supabase (idempotente).
-- =============================================================

insert into storage.buckets (id, name, public)
values ('recipe-images', 'recipe-images', true)
on conflict (id) do nothing;

drop policy if exists "recipe_images_public_read" on storage.objects;
create policy "recipe_images_public_read"
  on storage.objects for select
  using (bucket_id = 'recipe-images');

drop policy if exists "recipe_images_auth_insert" on storage.objects;
create policy "recipe_images_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'recipe-images');

drop policy if exists "recipe_images_auth_update" on storage.objects;
create policy "recipe_images_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'recipe-images');

drop policy if exists "recipe_images_auth_delete" on storage.objects;
create policy "recipe_images_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'recipe-images');
