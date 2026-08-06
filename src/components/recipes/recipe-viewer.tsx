"use client"

import * as React from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { useCity } from "@/components/providers/city-provider"
import { ServingSlider } from "@/components/recipes/serving-slider"
import { MacroPanel } from "@/components/recipes/macro-panel"
import { ShoppingListDialog } from "@/components/recipes/shopping-list-dialog"
import { RecipeLogbook } from "@/components/recipes/recipe-logbook"
import type { TimelineLog } from "@/components/recipes/recipe-timeline"
import type { AuthorOption } from "@/components/recipes/log-entry-form"
import {
  calcRatio,
  calcScaledAmount,
  formatAmount,
  formatIngredientAmount,
  type ViewerIngredient,
} from "@/lib/calculations"
import type { RecipeVersion, Tag } from "@/lib/schema"
import type { City } from "@/lib/cities"
import { TagBadge } from "@/components/tags/tag-badge"

type PriceData = Omit<
  ViewerIngredient,
  | "name"
  | "unit"
  | "amount_used"
  | "grams_per_unit"
  | "price_matters"
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
  logsByVersion: Record<string, TimelineLog[]>
  tagsByVersion?: Record<string, Tag[]>
  authors: AuthorOption[]
  canWrite: boolean
  currentUserId: string | null
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
  logsByVersion,
  tagsByVersion = {},
  authors,
  canWrite,
  currentUserId,
}: RecipeViewerProps) {
  const { city } = useCity()

  const activeVersionId =
    versions.find((v) => v.id === currentRecipeId)?.id ?? versions[0]?.id ?? ""
  const [versionId, setVersionId] = React.useState(activeVersionId)

  const activeVersion = versions.find((v) => v.id === versionId) ?? versions[0]

  // Slider de ingredientes — resize da receita (default: porção cadastrada)
  const baseServings = activeVersion?.base_servings ?? 1
  const [ingredientServings, setIngredientServings] =
    React.useState(baseServings)

  // Slider de macros — análise nutricional (default: 1 porção)
  const [macroServings, setMacroServings] = React.useState(1)

  // Reseta os sliders ao trocar de versão
  React.useEffect(() => {
    const t = window.setTimeout(() => {
      setIngredientServings(baseServings)
      setMacroServings(1)
    }, 0)
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

  const { missingPriceNames, incompleteTotal } = React.useMemo(() => {
    const names = ingredients
      .filter((ing) => ing.price == null && ing.price_matters)
      .map((ing) => ing.name)
    return {
      missingPriceNames: names,
      incompleteTotal: names.length > 0,
    }
  }, [ingredients])

  const hasPrices = ingredients.some((ing) => ing.price != null)
  const showPriceSection = ingredients.some((ing) => ing.price_matters)
  const hasVersions = versions.length > 1

  const scaledIngredients = React.useMemo(() => {
    const ratio = calcRatio(ingredientServings, baseServings)
    return ingredients.map((ing) => ({
      ...ing,
      scaled: calcScaledAmount(ing.amount_used, ratio),
    }))
  }, [ingredients, ingredientServings, baseServings])

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

      {/* Tags da versão ativa */}
      {activeVersion && tagsByVersion[activeVersion.id]?.length > 0 && (
        <section>
          <div className="flex flex-wrap gap-1.5">
            {tagsByVersion[activeVersion.id].map((tag) => (
              <TagBadge key={tag.id} tag={tag} />
            ))}
          </div>
        </section>
      )}

      {/* Ingredientes escalados (resize da receita) */}
      {activeVersion && (
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
              Ingredientes
            </h2>
            <span className="text-[0.7rem] tracking-[0.2em] uppercase text-zinc-400">
              {ingredientServings}{" "}
              {ingredientServings === 1 ? "porção" : "porções"}
            </span>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <ServingSlider
              value={ingredientServings}
              onChange={setIngredientServings}
            />
            <p className="mt-3 text-xs text-zinc-500">
              Base cadastrada: {formatAmount(baseServings)} porções · ajuste
              para redimensionar as quantidades
            </p>

            <ul className="mt-5 space-y-4">
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
          </div>

          <div className="mt-3 flex justify-end">
            <ShoppingListDialog
              recipeId={activeVersion.id}
              recipeTitle={activeVersion.title}
              ingredients={ingredients}
              servings={ingredientServings}
              baseServings={baseServings}
            />
          </div>
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

      {/* Análise nutricional — última coisa da página */}
      <Separator className="bg-zinc-800" />
      {activeVersion && (
        <MacroPanel
          ingredients={ingredients}
          servings={macroServings}
          baseServings={baseServings}
          hasPrices={hasPrices}
          showPriceSection={showPriceSection}
          city={city}
          missingPriceNames={missingPriceNames}
          incompleteTotal={incompleteTotal}
          onServingsChange={setMacroServings}
        />
      )}

      {/* Caderno de experimentos da versão ativa */}
      <Separator className="bg-zinc-800" />
      {activeVersion && (
        <RecipeLogbook
          recipeId={activeVersion.id}
          logs={logsByVersion[activeVersion.id] ?? []}
          authors={authors}
          canWrite={canWrite}
          currentUserId={currentUserId}
        />
      )}
    </div>
  )
}
