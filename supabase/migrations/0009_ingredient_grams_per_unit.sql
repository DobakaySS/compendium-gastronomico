-- =============================================================
-- Média de gramas por unidade (ingredientes medidos em "unidade").
-- Usada para converter quantidade -> gramas no cálculo de macros.
-- Executar no SQL Editor do Supabase.
-- =============================================================

alter table public.ingredients add column if not exists grams_per_unit numeric;
