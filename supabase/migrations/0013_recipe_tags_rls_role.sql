-- =============================================================
-- Hotfix: RLS de recipe_tags alinhado ao padrão do projeto.
-- As demais tabelas (recipes, recipe_authors, recipe_ingredients)
-- usam RLS por ROLE (admin/colaborador via JWT), com select para
-- todos autenticados. A policy original era por DONO (user_id),
-- o que bloqueava inserts/editores não-donos (403).
-- =============================================================

drop policy if exists "recipe_tags_manage_own" on public.recipe_tags;

create policy "recipe_tags_select"
  on public.recipe_tags for select
  to authenticated
  using (true);

create policy "recipe_tags_insert"
  on public.recipe_tags for insert
  to authenticated
  with check (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = any (
      array['admin'::text, 'colaborador'::text]
    )
  );

create policy "recipe_tags_update"
  on public.recipe_tags for update
  to authenticated
  using (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = any (
      array['admin'::text, 'colaborador'::text]
    )
  )
  with check (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = any (
      array['admin'::text, 'colaborador'::text]
    )
  );

create policy "recipe_tags_delete"
  on public.recipe_tags for delete
  to authenticated
  using (
    ((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = any (
      array['admin'::text, 'colaborador'::text]
    )
  );
