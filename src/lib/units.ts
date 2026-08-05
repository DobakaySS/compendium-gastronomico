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

// Unidades qualitativas: não possuem quantidade mensurável e ficam de fora
// do cálculo de macros e custos na receita.
export const QUALITATIVE_UNITS = ["a gosto", "pitada", "gotas"] as const

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
