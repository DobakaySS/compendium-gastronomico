"use client"

import { useMemo } from "react"
import {
  calcMacroTotals,
  formatAmount,
  formatCurrency,
  type ViewerIngredient,
} from "@/lib/calculations"

type MacroPanelProps = {
  ingredients: ViewerIngredient[]
  servings: number
  baseServings: number
  hasPrices: boolean
}

const MACRO_ITEMS = [
  { key: "kcal", label: "Calorias", unit: "kcal" },
  { key: "protein", label: "Proteína", unit: "g" },
  { key: "carbs", label: "Carboidratos", unit: "g" },
  { key: "fat", label: "Gorduras", unit: "g" },
] as const

export function MacroPanel({
  ingredients,
  servings,
  baseServings,
  hasPrices,
}: MacroPanelProps) {
  const totals = useMemo(
    () => calcMacroTotals(ingredients, servings, baseServings),
    [ingredients, servings, baseServings]
  )

  return (
    <section>
      <h2 className="mb-4 text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
        Análise nutricional
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {MACRO_ITEMS.map(({ key, label, unit }) => (
          <div
            key={key}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
          >
            <p className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
              {label}
            </p>
            <p className="mt-1 font-heading text-2xl text-zinc-300">
              {formatAmount(totals[key])}
              <span className="ml-1 text-xs text-zinc-500">{unit}</span>
            </p>
          </div>
        ))}
      </div>

      {hasPrices && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
            <p className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
              Custo total
            </p>
            <p className="mt-1 font-heading text-2xl text-zinc-300">
              {formatCurrency(totals.totalCost, totals.currency)}
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
            <p className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
              Custo por porção
            </p>
            <p className="mt-1 font-heading text-2xl text-zinc-300">
              {formatCurrency(totals.costPerServing, totals.currency)}
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
