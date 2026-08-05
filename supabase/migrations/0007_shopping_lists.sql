-- =============================================================
-- Fase 3 — Listas de compras por usuário
-- shopping_lists: lista gerada a partir da checagem de despensa.
-- shopping_list_items: itens a comprar (somente os faltantes),
-- com flag checked para marcar o que já foi comprado.
-- Executar no SQL Editor do Supabase.
-- =============================================================

-- -------------------------------------------------------------
-- shopping_lists (por usuário)
-- -------------------------------------------------------------
create table if not exists public.shopping_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipe_id uuid references public.recipes (id) on delete cascade,
  title text not null,
  servings numeric,
  created_at timestamptz not null default now()
);

create index if not exists shopping_lists_user_id_idx
  on public.shopping_lists (user_id);

alter table public.shopping_lists enable row level security;

create policy "shopping_lists_select_own"
  on public.shopping_lists for select
  to authenticated
  using (user_id = auth.uid());

create policy "shopping_lists_insert_own"
  on public.shopping_lists for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "shopping_lists_update_own"
  on public.shopping_lists for update
  to authenticated
  using (user_id = auth.uid());

create policy "shopping_lists_delete_own"
  on public.shopping_lists for delete
  to authenticated
  using (user_id = auth.uid());

-- -------------------------------------------------------------
-- shopping_list_items (itens da lista)
-- -------------------------------------------------------------
create table if not exists public.shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  shopping_list_id uuid not null references public.shopping_lists (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  amount numeric not null,
  unit text not null,
  checked boolean not null default false
);

create index if not exists shopping_list_items_list_id_idx
  on public.shopping_list_items (shopping_list_id);

alter table public.shopping_list_items enable row level security;

create policy "shopping_list_items_manage_own"
  on public.shopping_list_items for all
  to authenticated
  using (
    exists (
      select 1
      from public.shopping_lists sl
      where sl.id = shopping_list_id
        and sl.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.shopping_lists sl
      where sl.id = shopping_list_id
        and sl.user_id = auth.uid()
    )
  );

-- -------------------------------------------------------------
-- Permissões (tabelas criadas via SQL precisam de grants)
-- -------------------------------------------------------------
grant select, insert, update, delete on public.shopping_lists to authenticated;
grant select, insert, update, delete on public.shopping_list_items to authenticated;
