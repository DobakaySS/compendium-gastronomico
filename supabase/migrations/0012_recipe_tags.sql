-- =============================================================
-- Sistema de tags para receitas (catálogo compartilhado).
-- tags: lista global com cor; recipe_tags: vínculo por receita.
-- Executar no SQL Editor do Supabase.
-- =============================================================

-- -------------------------------------------------------------
-- tags (catálogo global, sem dono — como ingredients)
-- -------------------------------------------------------------
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#71717a',
  created_at timestamptz not null default now()
);

-- Nome único ignorando maiúsculas/minúsculas.
create unique index if not exists tags_name_lower_idx
  on public.tags (lower(name));

alter table public.tags enable row level security;

create policy "tags_select_auth"
  on public.tags for select
  to authenticated
  using (true);

create policy "tags_insert_auth"
  on public.tags for insert
  to authenticated
  with check (true);

-- -------------------------------------------------------------
-- recipe_tags (vínculo receita <-> tag)
-- -------------------------------------------------------------
create table if not exists public.recipe_tags (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (recipe_id, tag_id)
);

create index if not exists recipe_tags_tag_id_idx
  on public.recipe_tags (tag_id);

alter table public.recipe_tags enable row level security;

create policy "recipe_tags_manage_own"
  on public.recipe_tags for all
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
-- Grants
-- -------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant select on public.tags to anon;
grant select, insert on public.tags to authenticated;

grant select on public.recipe_tags to anon;
grant select, insert, update, delete on public.recipe_tags to authenticated;

-- -------------------------------------------------------------
-- Seed de tags padrão (paleta "quiet luxury")
-- -------------------------------------------------------------
insert into public.tags (name, color)
values
  ('Proteico', '#f87171'),
  ('Prato principal', '#fbbf24'),
  ('Sobremesa', '#c084fc'),
  ('Lanche', '#34d399'),
  ('Acompanhamento', '#60a5fa'),
  ('Vegano', '#4ade80'),
  ('Low carb', '#22d3ee'),
  ('Molho', '#f472b6'),
  ('Rápido', '#fb923c'),
  ('Café da manhã', '#fcd34d')
on conflict (lower(name)) do nothing;
