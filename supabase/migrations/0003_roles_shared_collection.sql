-- =============================================================
-- Fase Roles — Autorização Admin / Colaborador / Visitante
-- 1) Coleção compartilhada: leitura para todo authenticated
--    (admin, colaborador e visitante-anônimo).
-- 2) Escrita restrita a admin|colaborador via app_metadata.role.
-- 3) Função SECURITY DEFINER admin_create_user (admin cria colaboradores).
-- =============================================================

-- -------------------------------------------------------------
-- recipes
-- -------------------------------------------------------------
drop policy if exists "recipes_select_own" on public.recipes;
drop policy if exists "recipes_insert_own" on public.recipes;
drop policy if exists "recipes_update_own" on public.recipes;
drop policy if exists "recipes_delete_own" on public.recipes;

create policy "recipes_select"
  on public.recipes for select to authenticated using (true);

create policy "recipes_insert"
  on public.recipes for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'));

create policy "recipes_update"
  on public.recipes for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'));

create policy "recipes_delete"
  on public.recipes for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'));

-- -------------------------------------------------------------
-- ingredients (catálogo global)
-- -------------------------------------------------------------
drop policy if exists "ingredients_select_auth" on public.ingredients;
drop policy if exists "ingredients_insert_auth" on public.ingredients;

create policy "ingredients_select"
  on public.ingredients for select to authenticated using (true);

create policy "ingredients_insert"
  on public.ingredients for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'));

create policy "ingredients_update"
  on public.ingredients for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'));

create policy "ingredients_delete"
  on public.ingredients for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'));

-- -------------------------------------------------------------
-- authors
-- -------------------------------------------------------------
drop policy if exists "authors_select_own" on public.authors;
drop policy if exists "authors_insert_own" on public.authors;
drop policy if exists "authors_update_own" on public.authors;
drop policy if exists "authors_delete_own" on public.authors;

create policy "authors_select"
  on public.authors for select to authenticated using (true);

create policy "authors_insert"
  on public.authors for insert to authenticated
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador')
    and user_id = auth.uid()
  );

create policy "authors_update"
  on public.authors for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'))
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador')
    and user_id = auth.uid()
  );

create policy "authors_delete"
  on public.authors for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'));

-- -------------------------------------------------------------
-- recipe_ingredients
-- -------------------------------------------------------------
drop policy if exists "recipe_ingredients_manage_own" on public.recipe_ingredients;

create policy "recipe_ingredients_select"
  on public.recipe_ingredients for select to authenticated using (true);

create policy "recipe_ingredients_insert"
  on public.recipe_ingredients for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'));

create policy "recipe_ingredients_update"
  on public.recipe_ingredients for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'));

create policy "recipe_ingredients_delete"
  on public.recipe_ingredients for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'));

-- -------------------------------------------------------------
-- recipe_authors
-- -------------------------------------------------------------
drop policy if exists "recipe_authors_manage_own" on public.recipe_authors;

create policy "recipe_authors_select"
  on public.recipe_authors for select to authenticated using (true);

create policy "recipe_authors_insert"
  on public.recipe_authors for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'));

create policy "recipe_authors_update"
  on public.recipe_authors for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'));

create policy "recipe_authors_delete"
  on public.recipe_authors for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'));

-- -------------------------------------------------------------
-- recipe_logs
-- -------------------------------------------------------------
drop policy if exists "recipe_logs_manage_own" on public.recipe_logs;

create policy "recipe_logs_select"
  on public.recipe_logs for select to authenticated using (true);

create policy "recipe_logs_insert"
  on public.recipe_logs for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'));

create policy "recipe_logs_update"
  on public.recipe_logs for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'));

create policy "recipe_logs_delete"
  on public.recipe_logs for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'));

-- -------------------------------------------------------------
-- ingredient_prices
-- -------------------------------------------------------------
drop policy if exists "ingredient_prices_select_auth" on public.ingredient_prices;
drop policy if exists "ingredient_prices_insert_auth" on public.ingredient_prices;

create policy "ingredient_prices_select"
  on public.ingredient_prices for select to authenticated using (true);

create policy "ingredient_prices_insert"
  on public.ingredient_prices for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'));

create policy "ingredient_prices_update"
  on public.ingredient_prices for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'));

create policy "ingredient_prices_delete"
  on public.ingredient_prices for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador'));

-- -------------------------------------------------------------
-- Função: admin cria conta colaborador
-- (SECURITY DEFINER roda com privilégios do dono = postgres,
--  mas só autoriza se o chamador for admin).
-- -------------------------------------------------------------
create or replace function public.admin_create_user(
  p_email text,
  p_password text
) returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role text;
  v_uid uuid;
begin
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role'), '')
  into v_role;

  if v_role <> 'admin' then
    raise exception 'not_authorized';
  end if;

  v_uid := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, last_sign_in_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_uid,
    'authenticated',
    'authenticated',
    lower(p_email),
    crypt(p_password, gen_salt('bf')),
    now(),
    jsonb_build_object(
      'provider', 'email',
      'providers', jsonb_build_array('email'),
      'role', 'colaborador'
    ),
    jsonb_build_object('email', lower(p_email), 'email_verified', true),
    now(), now(), now()
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, id, updated_at
  ) values (
    v_uid::text,
    v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', lower(p_email)),
    'email',
    now(), now(), v_uid, now()
  );

  return v_uid;
end;
$$;