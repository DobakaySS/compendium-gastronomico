-- =============================================================
-- Flag "preço importa" por ingrediente.
-- Ingredientes como sal/água não precisam de preço registrado e
-- deixam de gerar avisos de "preço faltante".
-- =============================================================

alter table public.ingredients add column if not exists price_matters boolean not null default true;
