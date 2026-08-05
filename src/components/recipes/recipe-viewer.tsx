"use client"

import * as React from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useCity } from "@/components/providers/city-provider"
import { ServingSlider } from "@/components/recipes/serving-slider"
import { MacroPanel } from "@/components/recipes/macro-panel"
import { PantryCheckDialog } from "@/components/recipes/pantry-check-dialog"
import {
  calcRatio,
  calcScaledAmount,
  formatIngredientAmount,
  type ViewerIngredient,
} from "@/lib/calculations"
import type { RecipeVersion } from "@/lib/schema"
import type { City } from "@/lib/cities"

type PriceData = Omit<
  ViewerIngredient,
  | "name"
  | "unit"
  | "amount_used"
  | "kcal_per_100g"
  | "protein_per_100g"
  | "carbs_per_100g"
  | "fat_per_100g"
>

export type PricesByCity = Record<
  City,
  Record<string, PriceData>
>

type RecipeViewerProps = {
  currentRecipeId: string
  versions: RecipeVersion[]
  ingredientsByVersion: Record<string, ViewerIngredient[]>
  pricesByCity: PricesByCity
}

function instructionText(raw: string | { text: string }): string {
  if (typeof raw === "string") return raw
  return raw.text ?? ""
}

export function RecipeViewer({
  currentRecipeId,
  versions,
  ingredientsByVersion,
  pricesByCity,
}: RecipeViewerProps) {
  const { city } = useCity()

  const activeVersionId =
    versions.find((v) => v.id === currentRecipeId)?.id ?? versions[0]?.id ?? ""
  const [versionId, setVersionId] = React.useState(activeVersionId)

  const activeVersion = versions.find((v) => v.id === versionId) ?? versions[0]

  // Slider de porções — sincroniza ao trocar de versão (default base_servings)
  const baseServings = activeVersion?.base_servings ?? 1
  const [servings, setServings] = React.useState(baseServings)

  React.useEffect(() => {
    const t = window.setTimeout(() => setServings(baseServings), 0)
    return () => window.clearTimeout(t)
  }, [baseServings])

  const ingredients: ViewerIngredient[] = React.useMemo(() => {
    const rawIngredients = activeVersion
      ? ingredientsByVersion[activeVersion.id] ?? []
      : []
    const cityPrices = pricesByCity[city] ?? {}
    return rawIngredients.map((ing) => {
      const price = cityPrices[ing.id]
      return {
        ...ing,
        price: price?.price ?? null,
        currency: price?.currency ?? "BRL",
        reference_amount: price?.reference_amount ?? null,
        reference_unit: price?.reference_unit ?? null,
      }
    })
  }, [activeVersion, ingredientsByVersion, pricesByCity, city])

  const hasPrices = ingredients.some((ing) => ing.price != null)
  const hasVersions = versions.length > 1

  const scaledIngredients = React.useMemo(() => {
    const ratio = calcRatio(servings, baseServings)
    return ingredients.map((ing) => ({
      ...ing,
      scaled: calcScaledAmount(ing.amount_used, ratio),
    }))
  }, [ingredients, servings, baseServings])

  return (
    <div className="mt-10 flex flex-col gap-10">
      {/* Seletor de versões */}
      {hasVersions && (
        <section>
          <h2 className="mb-4 text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
            Versões
          </h2>
          <Tabs value={versionId} onValueChange={(v) => setVersionId(v ?? "")}>
            <TabsList className="w-full">
              {versions.map((v) => (
                <TabsTrigger key={v.id} value={v.id} className="flex-1">
                  {v.version_name ?? v.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </section>
      )}

      {/* Slider de porções */}
      <section>
        <ServingSlider
          value={servings}
          onChange={setServings}
          baseServings={baseServings}
        />
      </section>

      {/* Painel de macros e custos */}
      {activeVersion && (
        <MacroPanel
          ingredients={ingredients}
          servings={servings}
          baseServings={baseServings}
          hasPrices={hasPrices}
        />
      )}

      {/* Ingredientes escalados */}
      {activeVersion && (
        <section>
          <h2 className="mb-4 text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
            Ingredientes
          </h2>
          <ul className="space-y-4">
            {scaledIngredients.map((item, i) => (
              <li
                key={`${item.id}-${i}`}
                className="flex items-baseline justify-between gap-4 border-b border-zinc-800/70 pb-3"
              >
                <span className="text-sm text-zinc-100">{item.name}</span>
                <span className="shrink-0 text-sm text-zinc-400">
                  {formatIngredientAmount(item.scaled, item.unit)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Preparo */}
      {activeVersion && activeVersion.instructions.length > 0 && (
        <>
          <Separator className="bg-zinc-800" />
          <section>
            <h2 className="mb-4 text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
              Preparo
            </h2>
            <ol className="space-y-6">
              {activeVersion.instructions.map((step, i) => (
                <li key={i} className="flex gap-5">
                  <span className="font-heading text-lg text-zinc-500">
                    {i + 1}
                  </span>
                  <p className="text-sm leading-relaxed text-zinc-200">
                    {instructionText(step)}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}

      {/* Pantry Check */}
      <Separator className="bg-zinc-800" />
      <section>
        <PantryCheckDialog
          ingredients={ingredients}
          servings={servings}
          baseServings={baseServings}
          hasPrices={hasPrices}
        />
      </section>
    </div>
  )
}
