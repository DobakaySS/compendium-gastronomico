-- Phase 6b — recipe_logs: ownership por usuário (user_id)
-- Cada log passa a pertencer ao auth user que o criou, permitindo
-- editar/excluir apenas os próprios registros.

alter table public.recipe_logs
  add column user_id uuid references auth.users (id);

-- Backfill: os logs existentes pertencem ao dono do autor atribuído.
update public.recipe_logs rl
  set user_id = a.user_id
  from public.authors a
  where a.id = rl.author_id;

alter table public.recipe_logs
  alter column user_id set not null;

create index if not exists recipe_logs_user_idx
  on public.recipe_logs (user_id);

-- RLS: leitura para todos os autenticados; escrita/edição/exclusão
-- limitadas ao dono (user_id) ou a admin/colaborador.
drop policy if exists "recipe_logs_select" on public.recipe_logs;
drop policy if exists "recipe_logs_insert" on public.recipe_logs;
drop policy if exists "recipe_logs_update" on public.recipe_logs;
drop policy if exists "recipe_logs_delete" on public.recipe_logs;

create policy "recipe_logs_select" on public.recipe_logs
  for select to authenticated using (true);

create policy "recipe_logs_insert" on public.recipe_logs
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador')
  );

create policy "recipe_logs_update" on public.recipe_logs
  for update to authenticated
  using (
    auth.uid() = user_id
    or (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador')
  )
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador')
    or auth.uid() = user_id
  );

create policy "recipe_logs_delete" on public.recipe_logs
  for delete to authenticated
  using (
    auth.uid() = user_id
    or (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'colaborador')
  );
