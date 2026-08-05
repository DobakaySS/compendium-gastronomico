// ---------------------------------------------------------------------------
// Unidades de medida
// ---------------------------------------------------------------------------

export const MEASURABLE_UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "unidade",
  "xícara",
  "colher (sopa)",
  "colher (chá)",
] as const

// Unidades qualitativas: nutricionalmente negligenciáveis. Ficam de fora do
// cálculo de macros. "pitada" e "gotas" ainda aceitam uma quantidade
// informativa; apenas "a gosto" dispensa quantidade.
export const QUALITATIVE_UNITS = ["a gosto", "pitada", "gotas"] as const

// Unidades que não exigem quantidade (a quantidade é ignorada no salvamento).
export const AMOUNTLESS_UNITS = ["a gosto"] as const

export const RECIPE_UNITS = [
  ...MEASURABLE_UNITS,
  ...QUALITATIVE_UNITS,
] as const

export type RecipeUnit = (typeof RECIPE_UNITS)[number]

export function isQualitativeUnit(unit: string | null | undefined): boolean {
  if (!unit) return false
  const normalized = unit.trim().toLowerCase()
  return (QUALITATIVE_UNITS as readonly string[]).some(
    (u) => u.toLowerCase() === normalized
  )
}

export function isAmountlessUnit(unit: string | null | undefined): boolean {
  if (!unit) return false
  const normalized = unit.trim().toLowerCase()
  return (AMOUNTLESS_UNITS as readonly string[]).some(
    (u) => u.toLowerCase() === normalized
  )
}
