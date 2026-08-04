-- =============================================================
-- Fase 1 — Core CRUD: autores, ingredientes e receitas
-- Executar no SQL Editor do Supabase
-- =============================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- ingredients (catálogo global, sem dono)
-- -------------------------------------------------------------
create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_unit text,
  kcal_per_100g numeric,
  protein_per_100g numeric,
  carbs_per_100g numeric,
  fat_per_100g numeric,
  created_at timestamptz not null default now()
);

alter table public.ingredients enable row level security;

create policy "ingredients_select_auth"
  on public.ingredients for select
  to authenticated
  using (true);

create policy "ingredients_insert_auth"
  on public.ingredients for insert
  to authenticated
  with check (true);

-- -------------------------------------------------------------
-- authors (por usuário)
-- -------------------------------------------------------------
create table if not exists public.authors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists authors_user_id_idx on public.authors (user_id);

alter table public.authors enable row level security;

create policy "authors_select_own"
  on public.authors for select
  to authenticated
  using (user_id = auth.uid());

create policy "authors_insert_own"
  on public.authors for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "authors_update_own"
  on public.authors for update
  to authenticated
  using (user_id = auth.uid());

create policy "authors_delete_own"
  on public.authors for delete
  to authenticated
  using (user_id = auth.uid());

-- -------------------------------------------------------------
-- recipes (por usuário, com suporte a versionamento — Fase 2)
-- -------------------------------------------------------------
create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  base_servings numeric,
  prep_time_minutes numeric,
  effort_level numeric,
  instructions jsonb,
  parent_recipe_id uuid references public.recipes (id) on delete cascade,
  version_name text,
  public_token text unique,
  created_at timestamptz not null default now()
);

create index if not exists recipes_user_id_idx on public.recipes (user_id);
create index if not exists recipes_parent_recipe_id_idx on public.recipes (parent_recipe_id);

alter table public.recipes enable row level security;

create policy "recipes_select_own"
  on public.recipes for select
  to authenticated
  using (user_id = auth.uid());

create policy "recipes_insert_own"
  on public.recipes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "recipes_update_own"
  on public.recipes for update
  to authenticated
  using (user_id = auth.uid());

create policy "recipes_delete_own"
  on public.recipes for delete
  to authenticated
  using (user_id = auth.uid());

-- -------------------------------------------------------------
-- recipe_ingredients (vínculo receita <-> ingrediente)
-- -------------------------------------------------------------
create table if not exists public.recipe_ingredients (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  amount_used numeric,
  unit text,
  primary key (recipe_id, ingredient_id)
);

alter table public.recipe_ingredients enable row level security;

create policy "recipe_ingredients_manage_own"
  on public.recipe_ingredients for all
  to authenticated
  using (
    exists (
      select 1
      from public.recipes r
      where r.id = recipe_id
        and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.recipes r
      where r.id = recipe_id
        and r.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------
-- recipe_authors (vínculo receita <-> autor)
-- -------------------------------------------------------------
create table if not exists public.recipe_authors (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  author_id uuid not null references public.authors (id) on delete cascade,
  primary key (recipe_id, author_id)
);

alter table public.recipe_authors enable row level security;

create policy "recipe_authors_manage_own"
  on public.recipe_authors for all
  to authenticated
  using (
    exists (
      select 1
      from public.recipes r
      where r.id = recipe_id
        and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.recipes r
      where r.id = recipe_id
        and r.user_id = auth.uid()
    )
  );