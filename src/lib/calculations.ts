// ---------------------------------------------------------------------------
// Phase 2 — Math Engine
// Funções puras de conversão de porções, macros e custos.
// Todas recebem os dados brutos (fetch no Server Component) e o valor atual
// do slider, retornando os totais escalados.
// ---------------------------------------------------------------------------

import { isAmountlessUnit, isQualitativeUnit } from "@/lib/units"

export type ViewerIngredient = {
  id: string
  name: string
  unit: string
  amount_used: number
  grams_per_unit: number | null
  kcal_per_100g: number | null
  protein_per_100g: number | null
  carbs_per_100g: number | null
  fat_per_100g: number | null
  price_matters: boolean
  price: number | null
  currency: string
  reference_amount: number | null
  reference_unit: string | null
}

export type MacroTotals = {
  kcal: number
  protein: number
  carbs: number
  fat: number
  totalCost: number
  costPerServing: number
  currency: string
  missingUnitWeight: string[]
}

export type PantryLine = {
  ingredient: ViewerIngredient
  required: number
  inStock: number
  missing: number
  missingCost: number
}

export function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function formatCurrency(
  value: number,
  currency = "BRL"
): string {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(value)
  } catch {
    return `R$ ${value.toFixed(2)}`
  }
}

export function formatAmount(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 1,
  }).format(round(value))
}

// Exibe a quantidade de um ingrediente. "a gosto" mostra apenas a unidade;
// as demais (incluindo "pitada" e "gotas") mostram a quantidade quando houver.
export function formatIngredientAmount(amount: number, unit: string): string {
  if (isAmountlessUnit(unit)) return unit
  return `${formatAmount(amount)} ${unit}`
}

// Ratio = current_servings / base_servings
export function calcRatio(servings: number, baseServings: number): number {
  if (!baseServings || baseServings <= 0) return 1
  return servings / baseServings
}

// Converte a quantidade usada (na unidade da receita) para gramas, base para
// o cálculo de macros. "unidade" usa a média de gramas por unidade do
// ingrediente; sem essa média, o ingrediente não contribui macros (0g) e é
// reportado em missingUnitWeight.
export function convertToGrams(
  amount: number,
  unit: string,
  gramsPerUnit: number | null
): number {
  if (unit === "unidade") {
    return gramsPerUnit != null ? amount * gramsPerUnit : 0
  }
  return amount
}

// Per ingredient: amount_used * Ratio
export function calcScaledAmount(amountUsed: number, ratio: number): number {
  return amountUsed * ratio
}

// Macro escalado de um ingrediente: (amount * ratio / 100) * macro_per_100g
export function calcIngredientMacro(
  scaledAmount: number,
  macroPer100g: number | null
): number {
  if (macroPer100g == null) return 0
  return (scaledAmount / 100) * macroPer100g
}

// Custo de um ingrediente: (amount * ratio / reference_amount) * price
export function calcIngredientCost(
  scaledAmount: number,
  price: number | null,
  referenceAmount: number | null
): number {
  if (price == null || referenceAmount == null || referenceAmount <= 0) return 0
  return (scaledAmount / referenceAmount) * price
}

export function calcMacroTotals(
  ingredients: ViewerIngredient[],
  servings: number,
  baseServings: number
): MacroTotals {
  const ratio = calcRatio(servings, baseServings)
  let kcal = 0
  let protein = 0
  let carbs = 0
  let fat = 0
  let totalCost = 0
  const missingUnitWeight: string[] = []
  const currency =
    ingredients.find((ing) => ing.currency)?.currency ?? "BRL"

  for (const ing of ingredients) {
    const scaled = calcScaledAmount(ing.amount_used, ratio)
    // Unidades qualitativas ("a gosto", "pitada", "gotas") não entram nos
    // macros. Custos ainda são calculados quando há quantidade.
    if (!isQualitativeUnit(ing.unit)) {
      const grams = convertToGrams(scaled, ing.unit, ing.grams_per_unit)
      if (ing.unit === "unidade" && ing.grams_per_unit == null) {
        missingUnitWeight.push(ing.name)
      }
      kcal += calcIngredientMacro(grams, ing.kcal_per_100g)
      protein += calcIngredientMacro(grams, ing.protein_per_100g)
      carbs += calcIngredientMacro(grams, ing.carbs_per_100g)
      fat += calcIngredientMacro(grams, ing.fat_per_100g)
    }
    totalCost += calcIngredientCost(scaled, ing.price, ing.reference_amount)
  }

  return {
    kcal: round(kcal),
    protein: round(protein),
    carbs: round(carbs),
    fat: round(fat),
    totalCost: round(totalCost, 2),
    costPerServing: round(servings > 0 ? totalCost / servings : 0, 2),
    currency,
    missingUnitWeight: Array.from(new Set(missingUnitWeight)),
  }
}

// Pantry Check: required = scaled amount; missing = max(0, required - inStock)
export function calcPantryLines(
  ingredients: ViewerIngredient[],
  servings: number,
  baseServings: number,
  inStockByIngredientId: Record<string, number>
): PantryLine[] {
  const ratio = calcRatio(servings, baseServings)

  return ingredients
    .filter((ing) => !isAmountlessUnit(ing.unit))
    .map((ing) => {
      const required = calcScaledAmount(ing.amount_used, ratio)
      const inStock = inStockByIngredientId[ing.id] ?? 0
      const missing = Math.max(0, required - inStock)
      return {
        ingredient: ing,
        required,
        inStock,
        missing,
        missingCost: calcIngredientCost(
          missing,
          ing.price,
          ing.reference_amount
        ),
      }
    })
}
