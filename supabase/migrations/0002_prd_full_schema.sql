-- =============================================================
-- Fase 1 — Schema completo alinhado ao PRD.
-- Adiciona: recipes.image_url, recipes.techniques,
--          ingredient_prices (catálogo global) e recipe_logs (logbook).
-- Executar no SQL Editor do Supabase.
-- =============================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- recipes: novas colunas do PRD
-- -------------------------------------------------------------
alter table public.recipes add column if not exists image_url text;
alter table public.recipes add column if not exists techniques jsonb;

-- -------------------------------------------------------------
-- ingredient_prices (catálogo global, sem dono)
-- Preços históricos localizados por cidade.
-- -------------------------------------------------------------
create table if not exists public.ingredient_prices (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  city text not null,
  price numeric not null,
  currency text not null default 'BRL',
  recorded_on date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists ingredient_prices_lookup_idx
  on public.ingredient_prices (ingredient_id, city, recorded_on);

alter table public.ingredient_prices enable row level security;

create policy "ingredient_prices_select_auth"
  on public.ingredient_prices for select
  to authenticated
  using (true);

create policy "ingredient_prices_insert_auth"
  on public.ingredient_prices for insert
  to authenticated
  with check (true);

-- -------------------------------------------------------------
-- recipe_logs (logbook colaborativo)
-- Gerenciável pelo dono da receita (Fase 3 expõe leitura pública).
-- -------------------------------------------------------------
create table if not exists public.recipe_logs (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  author_id uuid not null references public.authors (id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists recipe_logs_recipe_idx on public.recipe_logs (recipe_id);
create index if not exists recipe_logs_author_idx on public.recipe_logs (author_id);

alter table public.recipe_logs enable row level security;

create policy "recipe_logs_manage_own"
  on public.recipe_logs for all
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