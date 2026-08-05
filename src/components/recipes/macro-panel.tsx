"use client"

import { useMemo } from "react"
import Link from "next/link"
import { MapPinIcon } from "lucide-react"
import {
  calcMacroTotals,
  formatAmount,
  formatCurrency,
  type ViewerIngredient,
} from "@/lib/calculations"
import { ServingSlider } from "@/components/recipes/serving-slider"

type MacroPanelProps = {
  ingredients: ViewerIngredient[]
  servings: number
  baseServings: number
  hasPrices: boolean
  showPriceSection: boolean
  city: string
  missingPriceNames: string[]
  incompleteTotal: boolean
  onServingsChange: (value: number) => void
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
  showPriceSection,
  city,
  missingPriceNames,
  incompleteTotal,
  onServingsChange,
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

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <ServingSlider value={servings} onChange={onServingsChange} />

        <p className="mt-3 text-xs text-zinc-500">
          Valores referentes a {servings}{" "}
          {servings === 1 ? "porção" : "porções"}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
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

        {totals.missingUnitWeight.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-xs leading-relaxed text-amber-200/90">
            <p className="font-medium text-amber-200">
              Macros incompletos — falta a média de g por unidade de:{" "}
              {totals.missingUnitWeight.join(", ")}.
            </p>
            <Link
              href="/ingredients"
              className="mt-1 inline-block tracking-[0.15em] uppercase text-amber-300/80 underline underline-offset-4 transition-colors hover:text-amber-200"
            >
              Corrigir no catálogo
            </Link>
          </div>
        )}

        {showPriceSection && hasPrices && (
          <>
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

            <div className="mt-3 flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1">
                <MapPinIcon className="size-3 text-zinc-500" />
                <span className="text-[0.65rem] tracking-[0.15em] uppercase text-zinc-400">
                  Preços em {city}
                </span>
              </div>
            </div>

            {incompleteTotal && missingPriceNames.length > 0 && (
              <div className="mt-3 rounded-xl border border-amber-900/60 bg-amber-950/30 px-4 py-3 text-xs leading-relaxed text-amber-200/90">
                <p className="font-medium text-amber-200">
                  Preços incompletos em {city}. Sem registro de preço:{" "}
                  {missingPriceNames.join(", ")}.
                </p>
                <Link
                  href="/ingredients"
                  className="mt-1 inline-block tracking-[0.15em] uppercase text-amber-300/80 underline underline-offset-4 transition-colors hover:text-amber-200"
                >
                  Cadastrar preços no catálogo
                </Link>
              </div>
            )}
          </>
        )}

        {showPriceSection && !hasPrices && (
          <div className="mt-3 flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1">
              <MapPinIcon className="size-3 text-zinc-500" />
              <span className="text-[0.65rem] tracking-[0.15em] uppercase text-zinc-400">
                {city}
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Nenhum preço registrado para esta cidade.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
