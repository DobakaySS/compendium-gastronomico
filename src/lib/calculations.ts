// ---------------------------------------------------------------------------
// Phase 2 — Math Engine
// Funções puras de conversão de porções, macros e custos.
// Todas recebem os dados brutos (fetch no Server Component) e o valor atual
// do slider, retornando os totais escalados.
// ---------------------------------------------------------------------------

export type ViewerIngredient = {
  id: string
  name: string
  unit: string
  amount_used: number
  kcal_per_100g: number | null
  protein_per_100g: number | null
  carbs_per_100g: number | null
  fat_per_100g: number | null
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

// Ratio = current_servings / base_servings
export function calcRatio(servings: number, baseServings: number): number {
  if (!baseServings || baseServings <= 0) return 1
  return servings / baseServings
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
  const currency =
    ingredients.find((ing) => ing.currency)?.currency ?? "BRL"

  for (const ing of ingredients) {
    const scaled = calcScaledAmount(ing.amount_used, ratio)
    kcal += calcIngredientMacro(scaled, ing.kcal_per_100g)
    protein += calcIngredientMacro(scaled, ing.protein_per_100g)
    carbs += calcIngredientMacro(scaled, ing.carbs_per_100g)
    fat += calcIngredientMacro(scaled, ing.fat_per_100g)
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

  return ingredients.map((ing) => {
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
