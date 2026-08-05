"use client"

import * as React from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Combobox } from "@/components/ui/combobox"
import { createClient } from "@/lib/supabase/client"
import { MEASURABLE_UNITS, isQualitativeUnit } from "@/lib/units"
import { formatIngredientAmount } from "@/lib/calculations"
import {
  saveSmartImport,
  type ParseResult,
  type ConfirmedIngredient,
  type UnmatchedIngredient,
} from "@/app/actions/ai-parser"
import { CheckIcon, Loader2Icon } from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  parsed: ParseResult
}

const UNITS = MEASURABLE_UNITS

const CREATE_NEW_VALUE = "__create_new__"

export function ImportConfirmation({ open, onOpenChange, parsed }: Props) {
  const [saving, setSaving] = React.useState(false)
  const [allIngredients, setAllIngredients] = React.useState<
    Array<{ value: string; label: string }>
  >([])

  // Estado por ingrediente unmatched (key = index na lista unmatched)
  const [unmatchedSelections, setUnmatchedSelections] = React.useState<
    Record<number, {
      selectedId: string
      createNew: boolean
      newName: string
      newUnit: string
      newGramsPerUnit: string
    }>
  >({})

  React.useEffect(() => {
    if (!open) return
    const t = window.setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("ingredients")
        .select("id, name, default_unit")
        .order("name")
      const rows = (data ?? []) as Array<{
        id: string
        name: string
        default_unit: string | null
      }>
      const opts = rows.map((row) => ({
        value: row.id,
        label: row.default_unit
          ? `${row.name} (${row.default_unit})`
          : row.name,
      }))
      setAllIngredients(opts)

      // Inicializar estado para unmatched
      const init: Record<number, (typeof unmatchedSelections)[number]> = {}
      parsed.ingredients.forEach((ing, idx) => {
        if (ing.match_type === "unmatched") {
          const firstId = ing.suggestions[0]?.id ?? ""
          init[idx] = {
            selectedId: firstId,
            createNew: false,
            newName: ing.ai_name,
            // Unidades qualitativas não podem ser a unidade padrão do ingrediente.
            newUnit: isQualitativeUnit(ing.unit) ? "g" : ing.unit,
            newGramsPerUnit:
              ing.grams_per_unit != null ? String(ing.grams_per_unit) : "",
          }
        }
      })
      setUnmatchedSelections(init)
    }, 0)
    return () => window.clearTimeout(t)
  }, [open, parsed])

  const getUnmatchedState = (idx: number, fallbackName: string) => {
    return (
      unmatchedSelections[idx] ?? {
        selectedId: CREATE_NEW_VALUE,
        createNew: true,
        newName: fallbackName,
        newUnit: "g",
        newGramsPerUnit: "",
      }
    )
  }

  const updateUnmatched = (
    idx: number,
    patch: Partial<{
      selectedId: string
      createNew: boolean
      newName: string
      newUnit: string
      newGramsPerUnit: string
    }>
  ) => {
    setUnmatchedSelections((prev) => ({
      ...prev,
      [idx]: { ...getUnmatchedState(idx, ""), ...patch },
    }))
  }

  const handleSave = async () => {
    const ingredients: ConfirmedIngredient[] = []
    let unmatchedIdx = 0

    for (const ing of parsed.ingredients) {
      if (ing.match_type === "exact") {
        ingredients.push({
          ai_name: ing.ai_name,
          amount_used: ing.amount_used,
          unit: ing.unit,
          ingredient_id: ing.db_ingredient.id,
        })
      } else {
        const sel = getUnmatchedState(unmatchedIdx, ing.ai_name)
        if (sel.createNew) {
          if (!sel.newName.trim()) {
            toast.error(`Informe o nome do novo ingrediente: ${ing.ai_name}`)
            return
          }
          ingredients.push({
            ai_name: ing.ai_name,
            amount_used: ing.amount_used,
            unit: ing.unit,
            create_new: {
              name: sel.newName.trim(),
              default_unit: sel.newUnit || ing.unit,
              macros: ing.macros,
              grams_per_unit:
                sel.newGramsPerUnit.trim() !== ""
                  ? Number(sel.newGramsPerUnit)
                  : null,
            },
          })
        } else if (sel.selectedId && sel.selectedId !== CREATE_NEW_VALUE) {
          ingredients.push({
            ai_name: ing.ai_name,
            amount_used: ing.amount_used,
            unit: ing.unit,
            ingredient_id: sel.selectedId,
          })
        } else {
          toast.error(
            `Selecione um ingrediente ou crie um novo para: ${ing.ai_name}`
          )
          return
        }
        unmatchedIdx++
      }
    }

    setSaving(true)
    try {
      await saveSmartImport({
        recipe: parsed.recipe,
        ingredients,
      })
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Erro ao salvar receita."
      toast.error(message)
      setSaving(false)
    }
  }

  const matchedCount = parsed.ingredients.filter(
    (i) => i.match_type === "exact"
  ).length
  const unmatched = parsed.ingredients.filter(
    (i) => i.match_type === "unmatched"
  ) as UnmatchedIngredient[]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Revisar receita</DialogTitle>
          <DialogDescription>
            Confirme os dados extraídos e resolva os ingredientes antes de
            salvar.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto pr-1">
          {/* Receita info */}
          <div className="space-y-3">
            <div>
              <p className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
                Título
              </p>
              <p className="font-heading text-lg text-zinc-100">
                {parsed.recipe.title}
              </p>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <Meta label="Porções" value={String(parsed.recipe.base_servings)} />
              <Meta
                label="Tempo"
                value={`${parsed.recipe.prep_time_minutes} min`}
              />
              <Meta
                label="Esforço"
                value={`${parsed.recipe.effort_level}/5`}
              />
            </div>

            {parsed.recipe.techniques.length > 0 && (
              <div>
                <p className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
                  Técnicas
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {parsed.recipe.techniques.map((t, i) => (
                    <Badge key={i} variant="secondary" className="capitalize">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator className="my-4 bg-zinc-800" />

          {/* Instruções */}
          <div>
            <p className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
              Instruções ({parsed.recipe.instructions.length} passos)
            </p>
            <ol className="mt-2 space-y-2">
              {parsed.recipe.instructions.map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-0.5 text-xs text-zinc-500">{i + 1}.</span>
                  <p className="text-xs leading-relaxed text-zinc-300">
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>

          <Separator className="my-4 bg-zinc-800" />

          {/* Ingredientes */}
          <div>
            <p className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
              Ingredientes ({parsed.ingredients.length})
            </p>

            <ul className="mt-2 space-y-3">
              {/* Matched — read-only */}
              {parsed.ingredients
                .filter((i) => i.match_type === "exact")
                .map((ing) => (
                  <li
                    key={ing.ai_name}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <CheckIcon className="size-4 text-green-500" />
                      <span className="text-sm text-zinc-100">
                        {ing.ai_name}
                      </span>
                      {isQualitativeUnit(ing.unit) && (
                        <Badge variant="outline" className="text-[0.6rem]">
                          sem macros
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500">
                      {formatIngredientAmount(ing.amount_used, ing.unit)}
                    </span>
                  </li>
                ))}

              {/* Unmatched */}
              {unmatched.map((ing, idx) => {
                const sel = getUnmatchedState(idx, ing.ai_name)
                return (
                  <li
                    key={idx}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-3"
                  >
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <span className="text-sm text-zinc-100">
                        {ing.ai_name}
                        {isQualitativeUnit(ing.unit) && (
                          <Badge variant="outline" className="ml-2 text-[0.6rem]">
                            sem macros
                          </Badge>
                        )}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {formatIngredientAmount(ing.amount_used, ing.unit)}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`unmatched-${idx}`}
                          checked={!sel.createNew}
                          onChange={() =>
                            updateUnmatched(idx, {
                              createNew: false,
                            })
                          }
                          className="accent-zinc-100"
                        />
                        <span className="text-[0.65rem] text-zinc-400">
                          Selecionar existente
                        </span>
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`unmatched-${idx}`}
                          checked={sel.createNew}
                          onChange={() =>
                            updateUnmatched(idx, {
                              createNew: true,
                            })
                          }
                          className="accent-zinc-100"
                        />
                        <span className="text-[0.65rem] text-zinc-400">
                          Criar novo
                        </span>
                      </label>
                    </div>

                    {sel.createNew ? (
                      <div className="mt-2 flex gap-2">
                        <Input
                          value={sel.newName}
                          onChange={(e) =>
                            updateUnmatched(idx, {
                              newName: e.target.value,
                            })
                          }
                          placeholder="Nome"
                          className="h-7 flex-1"
                        />
                        <select
                          value={sel.newUnit}
                          onChange={(e) =>
                            updateUnmatched(idx, {
                              newUnit: e.target.value,
                            })
                          }
                          className="h-7 w-28 rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-[0.7rem] text-zinc-300 focus:outline-none"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>

                        {sel.newUnit === "unidade" && (
                          <Input
                            value={sel.newGramsPerUnit}
                            onChange={(e) =>
                              updateUnmatched(idx, {
                                newGramsPerUnit: e.target.value,
                              })
                            }
                            type="number"
                            min={0.1}
                            step="0.1"
                            placeholder="g por unidade"
                            className="h-7 w-36"
                          />
                        )}
                      </div>
                    ) : (
                      <div className="mt-2">
                        <Combobox
                          options={allIngredients}
                          value={sel.selectedId}
                          onValueChange={(v) =>
                            updateUnmatched(idx, {
                              selectedId: v,
                            })
                          }
                          placeholder="Buscar ingrediente..."
                          searchPlaceholder="Digite para buscar..."
                          className="h-8 w-full"
                        />
                      </div>
                    )}

                    {(ing.macros.kcal_per_100g != null ||
                      ing.macros.protein_per_100g != null ||
                      ing.macros.carbs_per_100g != null ||
                      ing.macros.fat_per_100g != null) && (
                      <p className="mt-2 text-[0.65rem] text-zinc-500">
                        Macros estimados /100g:{" "}
                        {ing.macros.kcal_per_100g ?? "—"} kcal · P{" "}
                        {ing.macros.protein_per_100g ?? "—"}g · C{" "}
                        {ing.macros.carbs_per_100g ?? "—"}g · G{" "}
                        {ing.macros.fat_per_100g ?? "—"}g
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <DialogFooter className="mt-2 gap-2 sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <CheckIcon className="size-3.5 text-green-500" />
            <span>{matchedCount} correspondências exatas</span>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar receita"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[0.65rem] tracking-[0.15em] uppercase text-zinc-500">
        {label}{" "}
      </span>
      <span className="text-sm text-zinc-200">{value}</span>
    </div>
  )
}
