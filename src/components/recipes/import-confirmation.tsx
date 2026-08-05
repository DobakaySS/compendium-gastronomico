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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Combobox } from "@/components/ui/combobox"
import { createClient } from "@/lib/supabase/client"
import {
  MEASURABLE_UNITS,
  RECIPE_UNITS,
  isAmountlessUnit,
  isQualitativeUnit,
} from "@/lib/units"
import {
  saveSmartImport,
  type ParseResult,
  type ConfirmedIngredient,
} from "@/app/actions/ai-parser"
import {
  CheckIcon,
  Loader2Icon,
  PlusIcon,
  XIcon,
} from "lucide-react"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  parsed: ParseResult
}

type IngredientEdit = {
  selectedId: string
  createNew: boolean
  newName: string
  newUnit: string
  newGramsPerUnit: string
  macros: {
    kcal: string
    protein: string
    carbs: string
    fat: string
  }
  amount: string
  unit: string
}

function parseNum(value: string): number | null {
  const t = value.trim()
  if (t === "") return null
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function ImportConfirmation({ open, onOpenChange, parsed }: Props) {
  const [saving, setSaving] = React.useState(false)
  const [allIngredients, setAllIngredients] = React.useState<
    Array<{ value: string; label: string }>
  >([])
  const [selectedTags, setSelectedTags] = React.useState<string[]>(
    parsed.recipe.tags ?? []
  )
  const [title, setTitle] = React.useState(parsed.recipe.title)
  const [servings, setServings] = React.useState(
    String(parsed.recipe.base_servings)
  )
  const [time, setTime] = React.useState(String(parsed.recipe.prep_time_minutes))
  const [effort, setEffort] = React.useState(String(parsed.recipe.effort_level))
  const [techniques, setTechniques] = React.useState<string[]>(
    parsed.recipe.techniques
  )
  const [newTechnique, setNewTechnique] = React.useState("")
  const [instructions, setInstructions] = React.useState<string[]>(
    parsed.recipe.instructions.map((i) => i.text)
  )

  // Estado por ingrediente (key = índice na lista completa parsed.ingredients)
  const [ingredientEdits, setIngredientEdits] = React.useState<
    Record<number, IngredientEdit>
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

      // Inicializar estado de todos os ingredientes
      const init: Record<number, IngredientEdit> = {}
      parsed.ingredients.forEach((ing, idx) => {
        const unit = ing.unit
        const qual = isQualitativeUnit(unit)
        const base: IngredientEdit = {
          selectedId: "",
          createNew: false,
          newName: ing.ai_name,
          newUnit: qual ? "g" : unit,
          newGramsPerUnit:
            ing.grams_per_unit != null ? String(ing.grams_per_unit) : "",
          macros: {
            kcal:
              ing.macros.kcal_per_100g != null
                ? String(ing.macros.kcal_per_100g)
                : "",
            protein:
              ing.macros.protein_per_100g != null
                ? String(ing.macros.protein_per_100g)
                : "",
            carbs:
              ing.macros.carbs_per_100g != null
                ? String(ing.macros.carbs_per_100g)
                : "",
            fat:
              ing.macros.fat_per_100g != null
                ? String(ing.macros.fat_per_100g)
                : "",
          },
          amount: String(ing.amount_used),
          unit,
        }

        if (ing.match_type === "exact") {
          base.selectedId = ing.db_ingredient.id
        } else {
          base.selectedId = ing.suggestions[0]?.id ?? ""
          base.createNew = ing.suggestions.length === 0
        }
        init[idx] = base
      })
      setIngredientEdits(init)
      setSelectedTags(parsed.recipe.tags ?? [])
      setTitle(parsed.recipe.title)
      setServings(String(parsed.recipe.base_servings))
      setTime(String(parsed.recipe.prep_time_minutes))
      setEffort(String(parsed.recipe.effort_level))
      setTechniques(parsed.recipe.techniques)
      setNewTechnique("")
      setInstructions(parsed.recipe.instructions.map((i) => i.text))
    }, 0)
    return () => window.clearTimeout(t)
  }, [open, parsed])

  const updateEdit = (
    idx: number,
    patch: Partial<IngredientEdit>
  ) => {
    setIngredientEdits((prev) => ({
      ...prev,
      [idx]: { ...(prev[idx] ?? ({ unit: "g" } as IngredientEdit)), ...patch },
    }))
  }

  const updateUnit = (idx: number, unit: string) => {
    setIngredientEdits((prev) => {
      const cur = prev[idx] ?? ({ unit: "g" } as IngredientEdit)
      const patch: Partial<IngredientEdit> = { unit }
      if (isAmountlessUnit(unit) && cur.amount !== "0") patch.amount = "0"
      return { ...prev, [idx]: { ...cur, ...patch } }
    })
  }

  const addTechnique = () => {
    const value = newTechnique.trim()
    if (!value) return
    setTechniques((prev) =>
      prev.some((t) => t.toLowerCase() === value.toLowerCase())
        ? prev
        : [...prev, value]
    )
    setNewTechnique("")
  }

  const handleSave = async () => {
    const titleTrim = title.trim()
    if (!titleTrim) {
      toast.error("Informe o título da receita.")
      return
    }
    const servingsNum = Number(servings)
    if (!Number.isFinite(servingsNum) || servingsNum < 1) {
      toast.error("Informe um número de porções válido (mínimo 1).")
      return
    }
    const timeNum = Number(time)
    if (!Number.isFinite(timeNum) || timeNum < 0) {
      toast.error("Informe um tempo de preparo válido.")
      return
    }
    const effortNum = Number(effort)
    if (!Number.isFinite(effortNum) || effortNum < 1 || effortNum > 5) {
      toast.error("O esforço deve ser um número de 1 a 5.")
      return
    }
    const steps = instructions.map((s) => s.trim()).filter(Boolean)
    if (steps.length === 0) {
      toast.error("Adicione pelo menos um passo de instrução.")
      return
    }

    const ingredients: ConfirmedIngredient[] = []
    for (let i = 0; i < parsed.ingredients.length; i++) {
      const ing = parsed.ingredients[i]
      const edit = ingredientEdits[i]
      if (!edit) continue
      const amount = isAmountlessUnit(edit.unit)
        ? 0
        : Number(edit.amount)
      if (!Number.isFinite(amount) || amount < 0) {
        toast.error(`Quantidade inválida para: ${ing.ai_name}`)
        return
      }

      if (edit.createNew) {
        if (!edit.newName.trim()) {
          toast.error(`Informe o nome do novo ingrediente: ${ing.ai_name}`)
          return
        }
        ingredients.push({
          ai_name: ing.ai_name,
          amount_used: amount,
          unit: edit.unit,
          create_new: {
            name: edit.newName.trim(),
            default_unit: edit.newUnit || edit.unit,
            macros: {
              kcal_per_100g: parseNum(edit.macros.kcal),
              protein_per_100g: parseNum(edit.macros.protein),
              carbs_per_100g: parseNum(edit.macros.carbs),
              fat_per_100g: parseNum(edit.macros.fat),
            },
            grams_per_unit: parseNum(edit.newGramsPerUnit),
          },
        })
      } else {
        if (!edit.selectedId) {
          toast.error(
            `Selecione um ingrediente ou crie um novo para: ${ing.ai_name}`
          )
          return
        }
        ingredients.push({
          ai_name: ing.ai_name,
          amount_used: amount,
          unit: edit.unit,
          ingredient_id: edit.selectedId,
        })
      }
    }

    setSaving(true)
    try {
      await saveSmartImport({
        recipe: {
          title: titleTrim,
          base_servings: servingsNum,
          prep_time_minutes: timeNum,
          effort_level: effortNum,
          instructions: steps.map((text) => ({ text })),
          techniques,
          tags: selectedTags,
        },
        ingredients,
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao salvar receita."
      toast.error(message)
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Revisar receita</DialogTitle>
          <DialogDescription>
            Edite os dados extraídos e resolva os ingredientes antes de salvar.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto pr-1">
          {/* Receita */}
          <div className="space-y-3">
            <label className="block">
              <span className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
                Título
              </span>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nome da receita"
                className="mt-1 h-8"
              />
            </label>

            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
                  Porções
                </span>
                <Input
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  type="number"
                  min={1}
                  className="mt-1 h-8"
                />
              </label>
              <label className="block">
                <span className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
                  Tempo (min)
                </span>
                <Input
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  type="number"
                  min={0}
                  className="mt-1 h-8"
                />
              </label>
              <label className="block">
                <span className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
                  Esforço (1–5)
                </span>
                <Input
                  value={effort}
                  onChange={(e) => setEffort(e.target.value)}
                  type="number"
                  min={1}
                  max={5}
                  className="mt-1 h-8"
                />
              </label>
            </div>

            <div>
              <p className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
                Técnicas
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {techniques.map((t, i) => (
                  <Badge key={i} variant="secondary" className="capitalize">
                    {t}
                    <button
                      type="button"
                      aria-label={`Remover técnica ${t}`}
                      onClick={() =>
                        setTechniques((prev) =>
                          prev.filter((_, j) => j !== i)
                        )
                      }
                      className="ml-1 rounded-full text-zinc-400 outline-none hover:text-zinc-100 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  value={newTechnique}
                  onChange={(e) => setNewTechnique(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addTechnique()
                    }
                  }}
                  placeholder="Ex.: refogar"
                  className="h-7 flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addTechnique}
                >
                  Adicionar
                </Button>
              </div>
            </div>

            {parsed.recipe.tags.length > 0 && (
              <div>
                <p className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
                  Tags
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {parsed.recipe.tags.map((tag, i) => {
                    const active = selectedTags.includes(tag)
                    return (
                      <button
                        key={`${tag}-${i}`}
                        type="button"
                        onClick={() => {
                          setSelectedTags((prev) =>
                            active
                              ? prev.filter((t) => t !== tag)
                              : [...prev, tag]
                          )
                        }}
                        aria-pressed={active}
                        className="capitalize"
                      >
                        <Badge
                          variant="secondary"
                          className={
                            active
                              ? "ring-1 ring-zinc-100"
                              : "opacity-40 hover:opacity-70"
                          }
                        >
                          {tag}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
                <p className="mt-1 text-[0.65rem] text-zinc-500">
                  Toque para incluir/remover. As tags são salvas no catálogo
                  compartilhado.
                </p>
              </div>
            )}
          </div>

          <Separator className="my-4 bg-zinc-800" />

          {/* Instruções */}
          <div>
            <p className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
              Instruções ({instructions.length} passos)
            </p>
            <ol className="mt-2 space-y-2">
              {instructions.map((step, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-2 text-xs text-zinc-500">{i + 1}.</span>
                  <Textarea
                    value={step}
                    onChange={(e) =>
                      setInstructions((prev) =>
                        prev.map((s, j) => (j === i ? e.target.value : s))
                      )
                    }
                    rows={2}
                    className="min-h-0 flex-1 resize-y text-xs leading-relaxed text-zinc-300"
                  />
                  <button
                    type="button"
                    aria-label="Remover passo"
                    onClick={() =>
                      setInstructions((prev) =>
                        prev.length > 1
                          ? prev.filter((_, j) => j !== i)
                          : prev
                      )
                    }
                    className="mt-2 text-zinc-500 outline-none hover:text-zinc-300 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                </li>
              ))}
            </ol>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setInstructions((prev) => [...prev, ""])}
              className="mt-2"
            >
              <PlusIcon className="size-3.5" />
              Adicionar passo
            </Button>
          </div>

          <Separator className="my-4 bg-zinc-800" />

          {/* Ingredientes */}
          <div>
            <p className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
              Ingredientes ({parsed.ingredients.length})
            </p>

            <ul className="mt-2 space-y-3">
              {parsed.ingredients.map((ing, idx) => {
                const edit = ingredientEdits[idx]
                if (!edit) return null
                const qual = isQualitativeUnit(edit.unit)
                return (
                  <li
                    key={idx}
                    className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm text-zinc-100">
                        {!edit.createNew && (
                          <CheckIcon className="size-4 shrink-0 text-green-500" />
                        )}
                        <span>{ing.ai_name}</span>
                        {qual && (
                          <Badge variant="outline" className="text-[0.6rem]">
                            sem macros
                          </Badge>
                        )}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        value={edit.amount}
                        onChange={(e) =>
                          updateEdit(idx, { amount: e.target.value })
                        }
                        type="number"
                        min={0}
                        step="any"
                        placeholder="Quantidade"
                        disabled={isAmountlessUnit(edit.unit)}
                        className="h-7 w-24"
                      />
                      <select
                        value={edit.unit}
                        onChange={(e) => updateUnit(idx, e.target.value)}
                        className="h-7 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-[0.7rem] text-zinc-300 focus:outline-none"
                      >
                        {RECIPE_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-2 flex gap-3">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`ingredient-${idx}`}
                          checked={!edit.createNew}
                          onChange={() => updateEdit(idx, { createNew: false })}
                          className="accent-zinc-100"
                        />
                        <span className="text-[0.65rem] text-zinc-400">
                          Selecionar existente
                        </span>
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="radio"
                          name={`ingredient-${idx}`}
                          checked={edit.createNew}
                          onChange={() => updateEdit(idx, { createNew: true })}
                          className="accent-zinc-100"
                        />
                        <span className="text-[0.65rem] text-zinc-400">
                          Criar novo
                        </span>
                      </label>
                    </div>

                    {edit.createNew ? (
                      <div className="mt-2 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={edit.newName}
                            onChange={(e) =>
                              updateEdit(idx, { newName: e.target.value })
                            }
                            placeholder="Nome"
                            className="h-7 flex-1"
                          />
                          <select
                            value={edit.newUnit}
                            onChange={(e) =>
                              updateEdit(idx, { newUnit: e.target.value })
                            }
                            className="h-7 w-28 rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-[0.7rem] text-zinc-300 focus:outline-none"
                          >
                            {MEASURABLE_UNITS.map((u) => (
                              <option key={u} value={u}>
                                {u}
                              </option>
                            ))}
                          </select>

                          {edit.newUnit === "unidade" && (
                            <Input
                              value={edit.newGramsPerUnit}
                              onChange={(e) =>
                                updateEdit(idx, {
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

                        <div className="flex gap-2">
                          <MacroInput
                            label="kcal"
                            value={edit.macros.kcal}
                            onChange={(v) =>
                              updateEdit(idx, {
                                macros: { ...edit.macros, kcal: v },
                              })
                            }
                          />
                          <MacroInput
                            label="P (g)"
                            value={edit.macros.protein}
                            onChange={(v) =>
                              updateEdit(idx, {
                                macros: { ...edit.macros, protein: v },
                              })
                            }
                          />
                          <MacroInput
                            label="C (g)"
                            value={edit.macros.carbs}
                            onChange={(v) =>
                              updateEdit(idx, {
                                macros: { ...edit.macros, carbs: v },
                              })
                            }
                          />
                          <MacroInput
                            label="G (g)"
                            value={edit.macros.fat}
                            onChange={(v) =>
                              updateEdit(idx, {
                                macros: { ...edit.macros, fat: v },
                              })
                            }
                          />
                        </div>
                        <p className="text-[0.65rem] text-zinc-500">
                          Macros estimados por 100g (editáveis).
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2">
                        <Combobox
                          options={allIngredients}
                          value={edit.selectedId}
                          onValueChange={(v) =>
                            updateEdit(idx, { selectedId: v })
                          }
                          placeholder="Buscar ingrediente..."
                          searchPlaceholder="Digite para buscar..."
                          className="h-8 w-full"
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <DialogFooter className="mt-2 gap-2 sm:justify-between">
          <div className="flex items-center text-xs text-zinc-500">
            {parsed.ingredients.length} ingredientes
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
            <Button type="button" onClick={handleSave} disabled={saving}>
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

function MacroInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="flex-1">
      <span className="block text-[0.6rem] text-zinc-500">{label}</span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type="number"
        min={0}
        step="any"
        placeholder="—"
        className="h-7 text-[0.7rem]"
      />
    </label>
  )
}
