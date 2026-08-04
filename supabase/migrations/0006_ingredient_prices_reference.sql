-- =============================================================
-- Fase 2 — ingredient_prices: reference_amount/unit
-- O preço agora carrega a quantidade de referência.
-- Ex.: farinha R$5,00 por 1000g -> reference_amount=1000, reference_unit='g'
-- Custo: (amount_used * ratio / reference_amount) * price
-- Executar no SQL Editor do Supabase.
-- =============================================================

alter table public.ingredient_prices
  add column if not exists reference_amount numeric not null default 100;

alter table public.ingredient_prices
  add column if not exists reference_unit text not null default 'g';

-- Mantém permissões para authenticated (select/insert) já existentes.
