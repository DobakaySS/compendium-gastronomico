"use client"

import { useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import {
  calcMacrosByWeight,
  calcTotalPreparedWeight,
  formatAmount,
  type ViewerIngredient,
} from "@/lib/calculations"

type WeightEstimatorProps = {
  ingredients: ViewerIngredient[]
}

export function WeightEstimator({ ingredients }: WeightEstimatorProps) {
  const [grams, setGrams] = useState("")

  const totalWeight = useMemo(
    () => calcTotalPreparedWeight(ingredients),
    [ingredients]
  )

  const estimate = useMemo(
    () => calcMacrosByWeight(ingredients, Number(grams)),
    [ingredients, grams]
  )

  return (
    <div className="mt-5 border-t border-zinc-800/70 pt-4">
      <div className="flex items-center justify-between gap-4">
        <label
          htmlFor="weight-estimator-grams"
          className="text-xs text-zinc-400"
        >
          Peso do pronto (g)
        </label>
        <div className="relative w-28">
          <Input
            id="weight-estimator-grams"
            type="number"
            min={0}
            step="1"
            inputMode="decimal"
            placeholder="0"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            disabled={totalWeight.weight <= 0}
            className="pr-6 text-right"
          />
          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-zinc-500">
            g
          </span>
        </div>
      </div>

      <p className="mt-2 text-[0.7rem] leading-relaxed text-zinc-500">
        Estimativa pela soma dos ingredientes
        {totalWeight.weight > 0 && (
          <> · prato inteiro ≈ {formatAmount(totalWeight.weight)} g</>
        )}
        . O cozimento pode alterar o peso final.
      </p>

      {totalWeight.missingUnitWeight.length > 0 && (
        <p className="mt-1 text-[0.7rem] leading-relaxed text-amber-200/70">
          Falta a média de g por unidade de{" "}
          {totalWeight.missingUnitWeight.join(", ")} — o peso total fica
          subestimado.
        </p>
      )}

      {totalWeight.weight <= 0 && (
        <p className="mt-1 text-[0.7rem] text-zinc-500">
          Sem ingredientes mensuráveis.
        </p>
      )}

      {estimate && (
        <p className="mt-3 text-sm text-zinc-300">
          <span className="font-heading text-zinc-100">
            ≈ {formatAmount(estimate.kcal)} kcal
          </span>
          <span className="text-zinc-500">
            {" "}
            · {formatAmount(estimate.protein)} g prot ·{" "}
            {formatAmount(estimate.carbs)} g carb ·{" "}
            {formatAmount(estimate.fat)} g gord
          </span>
        </p>
      )}
    </div>
  )
}
