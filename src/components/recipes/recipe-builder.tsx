"use client"

import { useActionState, useCallback, useEffect, useMemo, useState, startTransition } from "react"
import { useForm, useFieldArray, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { RecipeSchema, type RecipeFormValues } from "@/lib/schema"
import { saveRecipe, type FormState } from "@/app/actions/recipes"
import { createClient } from "@/lib/supabase/client"
import type { Ingredient, Author } from "@/lib/schema"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
  FieldDescription,
} from "@/components/ui/field"
import { Combobox, ComboboxMulti } from "@/components/ui/combobox"
import { NewIngredientDialog } from "@/components/recipes/new-ingredient-dialog"
import { RecipeImagePicker } from "@/components/recipes/recipe-image-picker"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { RECIPE_UNITS, isAmountlessUnit, isQualitativeUnit } from "@/lib/units"
import { formatIngredientAmount } from "@/lib/calculations"
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"

const UNITS = RECIPE_UNITS

const EFFORT_LABELS = ["Muito fácil", "Fácil", "Médio", "Difícil", "Muito difícil"]

type RecipeBuilderProps = {
  mode?: "create" | "edit"
  recipeId?: string
  initialData?: RecipeFormValues
  submitLabel?: string
}

const DEFAULT_VALUES: RecipeFormValues = {
  title: "",
  image_url: null,
  base_servings: 4,
  prep_time_minutes: 30,
  effort_level: 3,
  instructions: [],
  ingredients: [],
  author_ids: [],
}

export function RecipeBuilder({
  mode = "create",
  recipeId,
  initialData,
  submitLabel = "Criar receita",
}: RecipeBuilderProps) {
  const [state, formAction, pending] = useActionState<
    FormState<{ id: string }>,
    FormData
  >(saveRecipe, null)

  const [saveMode, setSaveMode] = useState<"update" | "version">("update")

  const [ingredients, setIngredients] = useState<
    Array<Pick<Ingredient, "id" | "name" | "default_unit">>
  >([])
  const [authors, setAuthors] = useState<Array<Pick<Author, "id" | "name">>>([])
  const [loadingIngredients, setLoadingIngredients] = useState(true)
  const [loadingAuthors, setLoadingAuthors] = useState(true)

  const [pendingIngredientId, setPendingIngredientId] = useState("")
  const [pendingAmount, setPendingAmount] = useState("")
  const [pendingUnit, setPendingUnit] = useState<string>(UNITS[0])
  const [ingredientDialogOpen, setIngredientDialogOpen] = useState(false)

  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editIngredientId, setEditIngredientId] = useState("")
  const [editAmount, setEditAmount] = useState("")
  const [editUnit, setEditUnit] = useState("")

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<RecipeFormValues>({
    resolver: zodResolver(RecipeSchema),
    defaultValues: initialData ?? DEFAULT_VALUES,
  })

  const ingredientsArray = useFieldArray<RecipeFormValues, "ingredients">({
    control,
    name: "ingredients",
  })
  const instructionsArray = useFieldArray<RecipeFormValues, "instructions">({
    control,
    name: "instructions",
  })

  const loadIngredients = useCallback(() => {
    const supabase = createClient()
    return supabase
      .from("ingredients")
      .select("id, name, default_unit")
      .order("name")
      .then(({ data, error }) => {
        if (!error && data) setIngredients(data)
        setLoadingIngredients(false)
        return data ?? []
      })
  }, [])

  useEffect(() => {
    loadIngredients()
  }, [loadIngredients])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from("authors")
      .select("id, name")
      .order("name")
      .then(({ data, error }) => {
        if (!error && data) setAuthors(data)
        setLoadingAuthors(false)
      })
  }, [])

  const ingredientOptions = useMemo(
    () =>
      ingredients.map((ingredient) => ({
        value: ingredient.id,
        label: ingredient.default_unit
          ? `${ingredient.name} (${ingredient.default_unit})`
          : ingredient.name,
      })),
    [ingredients]
  )

  const authorOptions = useMemo(
    () => authors.map((author) => ({ value: author.id, label: author.name })),
    [authors]
  )

  const pendingIngredient = ingredients.find(
    (ingredient) => ingredient.id === pendingIngredientId
  )

  const pendingUnitIsQualitative = isQualitativeUnit(pendingUnit)
  const pendingUnitIsAmountless = isAmountlessUnit(pendingUnit)

  const addIngredientToList = () => {
    const amount = pendingUnitIsAmountless
      ? 0
      : Number(pendingAmount) || 0
    const project = {
      ingredient_id: pendingIngredientId,
      amount_used: amount,
      unit: pendingUnit,
    }
    ingredientsArray.append(project)
    setPendingIngredientId("")
    setPendingAmount("")
    setPendingUnit(pendingIngredient?.default_unit ?? UNITS[0])
  }

  const onPendingIngredientChange = (value: string) => {
    setPendingIngredientId(value)
    const ingredient = ingredients.find((ingredient) => ingredient.id === value)
    if (ingredient?.default_unit) setPendingUnit(ingredient.default_unit)
  }

  const onPendingUnitChange = (value: string) => {
    setPendingUnit(value)
    if (isAmountlessUnit(value)) setPendingAmount("")
  }

  const startEdit = (index: number) => {
    const line = ingredientsArray.fields[index]
    if (!line) return
    setEditingIndex(index)
    setEditIngredientId(line.ingredient_id)
    setEditAmount(line.amount_used > 0 ? String(line.amount_used) : "")
    setEditUnit(line.unit)
  }

  const onEditUnitChange = (value: string) => {
    setEditUnit(value)
    if (isAmountlessUnit(value)) setEditAmount("")
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditIngredientId("")
    setEditAmount("")
    setEditUnit("")
  }

  const saveEdit = (index: number) => {
    if (!editIngredientId) {
      toast.error("Escolha um ingrediente.")
      return
    }
    if (!isQualitativeUnit(editUnit) && (!editAmount || Number(editAmount) <= 0)) {
      toast.error("Quantidade deve ser maior que zero.")
      return
    }
    ingredientsArray.update(index, {
      ingredient_id: editIngredientId,
      amount_used: isAmountlessUnit(editUnit) ? 0 : Number(editAmount) || 0,
      unit: editUnit,
    })
    cancelEdit()
  }

  const handleIngredientCreated = (id: string) => {
    setPendingIngredientId(id)
    setLoadingIngredients(true)
    loadIngredients().then((rows) => {
      const ingredient = rows.find((item) => item.id === id)
      if (ingredient?.default_unit) setPendingUnit(ingredient.default_unit)
    })
  }

  const onSubmit = useCallback(
    (values: RecipeFormValues) => {
      const fd = new FormData()
      fd.set("save_mode", mode === "edit" ? saveMode : "create")
      if (mode === "edit" && recipeId) fd.set("id", recipeId)
      fd.set("title", values.title)
      fd.set("image_url", values.image_url ?? "")
      fd.set("base_servings", String(values.base_servings))
      fd.set("prep_time_minutes", String(values.prep_time_minutes))
      fd.set("effort_level", String(values.effort_level))
      values.instructions.forEach((step) => fd.append("instructions", step.text))
      values.ingredients.forEach((line) => {
        fd.append("ingredient_id", line.ingredient_id)
        fd.append("amount_used", String(line.amount_used))
        fd.append("unit", line.unit)
      })
      values.author_ids.forEach((author_id) => fd.append("author_id", author_id))
      startTransition(() => {
        formAction(fd)
      })
    },
    [formAction, mode, recipeId, saveMode]
  )

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>
          {mode === "edit" ? "Editar receita" : "Nova receita"}
        </CardTitle>
        <CardDescription>
          Preencha os dados básicos, os passos e os ingredientes da receita.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="flex flex-col gap-6">
          {/* Básicos */}
          <div className="flex flex-col gap-4">
            <Field orientation="vertical">
              <FieldLabel>Imagem (opcional)</FieldLabel>
              <FieldContent>
                <RecipeImagePicker
                  value={getValues("image_url")}
                  onChange={(url) =>
                    setValue("image_url", url, { shouldValidate: true })
                  }
                />
              </FieldContent>
            </Field>

            <Field orientation="vertical">
              <FieldLabel htmlFor="title">Título</FieldLabel>
              <FieldContent>
                <Input
                  id="title"
                  placeholder="ex.: Carbonara"
                  {...register("title")}
                />
                <FieldError errors={[{ message: errors.title?.message }]} />
              </FieldContent>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field orientation="vertical">
                <FieldLabel htmlFor="base_servings">Porções base</FieldLabel>
                <FieldContent>
                  <Input id="base_servings" type="number" min={1} inputMode="numeric" {...register("base_servings", { setValueAs: (v) => Number(v) })} />
                  <FieldError errors={[{ message: errors.base_servings?.message }]} />
                </FieldContent>
              </Field>
              <Field orientation="vertical">
                <FieldLabel htmlFor="prep_time_minutes">Tempo de preparo (min)</FieldLabel>
                <FieldContent>
                  <Input id="prep_time_minutes" type="number" min={0} inputMode="numeric" {...register("prep_time_minutes", { setValueAs: (v) => Number(v) })} />
                  <FieldError errors={[{ message: errors.prep_time_minutes?.message }]} />
                </FieldContent>
              </Field>
            </div>

            <Field orientation="vertical">
              <FieldLabel>Nível de esforço</FieldLabel>
              <FieldContent>
                <Controller
                  control={control}
                  name="effort_level"
                  render={({ field }) => (
                    <div className="w-full">
                      <Slider
                        min={1}
                        max={5}
                        step={1}
                        value={[field.value]}
                        onValueChange={(value) =>
                          field.onChange(Array.isArray(value) ? value[0] : value)
                        }
                      />
                      <FieldDescription className="mt-2 font-medium">
                        {field.value} · {EFFORT_LABELS[field.value - 1]}
                      </FieldDescription>
                    </div>
                  )}
                />
              </FieldContent>
            </Field>
          </div>

          <Separator />

          {/* Instruções */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Instruções (passo a passo)</h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => instructionsArray.append({ text: "" })}
              >
                <PlusIcon /> Adicionar passo
              </Button>
            </div>
            {instructionsArray.fields.map((field, index) => (
              <Field key={field.id} orientation="vertical">
                <FieldContent>
                  <div className="flex gap-2">
                    <span className="mt-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm font-medium">
                      {index + 1}
                    </span>
                    <Textarea
                      rows={2}
                      placeholder={`Passo ${index + 1}`}
                      {...register(`instructions.${index}.text` as const)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Remover passo"
                      onClick={() => instructionsArray.remove(index)}
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                  <FieldError errors={[{ message: errors.instructions?.[index]?.text?.message }]} />
                </FieldContent>
              </Field>
            ))}
            {errors.instructions?.root?.message && (
              <p className="text-sm text-destructive">{errors.instructions.root.message}</p>
            )}
            {errors.instructions && typeof errors.instructions.message === "string" && (
              <p className="text-sm text-destructive">{errors.instructions.message}</p>
            )}
          </div>

          <Separator />

          {/* Ingredientes */}
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-medium">Ingredientes</h2>

            <div className="flex flex-col gap-3 rounded-lg border p-3">
              <Field orientation="vertical">
                <FieldLabel>Ingrediente</FieldLabel>
                <FieldContent>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Combobox
                        options={ingredientOptions}
                        value={pendingIngredientId}
                        onValueChange={onPendingIngredientChange}
                        placeholder="Buscar ingrediente..."
                        emptyText="Nenhum ingrediente encontrado"
                        loading={loadingIngredients}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIngredientDialogOpen(true)}
                      className="shrink-0"
                    >
                      <PlusIcon /> Novo
                    </Button>
                  </div>
                </FieldContent>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field orientation="vertical">
                  <FieldLabel>Quantidade</FieldLabel>
                  <FieldContent>
                    <Input
                      type="number"
                      min={0}
                      step="0.1"
                      inputMode="decimal"
                      placeholder={pendingUnitIsAmountless ? "Sem quantidade" : "0"}
                      disabled={pendingUnitIsAmountless}
                      value={pendingAmount}
                      onChange={(e) => setPendingAmount(e.target.value)}
                    />
                    {pendingUnitIsAmountless && (
                      <p className="mt-1 text-[0.65rem] text-zinc-500">
                        Sem quantidade — não entra nos macros.
                      </p>
                    )}
                    {pendingUnitIsQualitative && !pendingUnitIsAmountless && (
                      <p className="mt-1 text-[0.65rem] text-zinc-500">
                        Quantidade informativa — não entra nos macros.
                      </p>
                    )}
                  </FieldContent>
                </Field>
                <Field orientation="vertical">
                  <FieldLabel>Unidade</FieldLabel>
                  <FieldContent>
                    <Select value={pendingUnit} onValueChange={(v) => onPendingUnitChange(v ?? "")}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="w-full">
                        {UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldContent>
                </Field>
              </div>
              <Button
                type="button"
                variant="outline"
                className="self-start"
                disabled={
                  !pendingIngredientId ||
                  (!pendingUnitIsQualitative && !pendingAmount)
                }
                onClick={addIngredientToList}
              >
                <PlusIcon /> Adicionar à lista
              </Button>
            </div>

            {ingredientsArray.fields.length > 0 && (
              <div className="flex flex-col gap-2">
                {ingredientsArray.fields.map((field, index) =>
                  editingIndex === index ? (
                    <div
                      key={field.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-3"
                    >
                      <div className="flex flex-col gap-3">
                        <Field orientation="vertical">
                          <FieldLabel>Ingrediente</FieldLabel>
                          <FieldContent>
                            <Combobox
                              options={ingredientOptions}
                              value={editIngredientId}
                              onValueChange={setEditIngredientId}
                              placeholder="Buscar ingrediente..."
                              emptyText="Nenhum ingrediente encontrado"
                              loading={loadingIngredients}
                            />
                          </FieldContent>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                          <Field orientation="vertical">
                            <FieldLabel>Quantidade</FieldLabel>
                            <FieldContent>
                              <Input
                                type="number"
                                min={0}
                                step="0.1"
                                inputMode="decimal"
                                disabled={isAmountlessUnit(editUnit)}
                                placeholder={isAmountlessUnit(editUnit) ? "Sem quantidade" : "0"}
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                              />
                              {isAmountlessUnit(editUnit) && (
                                <p className="mt-1 text-[0.65rem] text-zinc-500">
                                  Sem quantidade — não entra nos macros.
                                </p>
                              )}
                              {isQualitativeUnit(editUnit) && !isAmountlessUnit(editUnit) && (
                                <p className="mt-1 text-[0.65rem] text-zinc-500">
                                  Quantidade informativa — não entra nos macros.
                                </p>
                              )}
                            </FieldContent>
                          </Field>
                          <Field orientation="vertical">
                            <FieldLabel>Unidade</FieldLabel>
                            <FieldContent>
                              <Select
                                value={editUnit}
                                onValueChange={(v) => onEditUnitChange(v ?? "")}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="w-full">
                                  {UNITS.map((unit) => (
                                    <SelectItem key={unit} value={unit}>
                                      {unit}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FieldContent>
                          </Field>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => saveEdit(index)}
                          >
                            Salvar
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={cancelEdit}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={field.id}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                    >
                      <span className="flex-1">
                        {ingredientOptions.find((o) => o.value === field.ingredient_id)?.label ?? "Ingrediente"}
                        <span className="ml-2 text-muted-foreground">
                          {formatIngredientAmount(field.amount_used, field.unit)}
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Editar ingrediente"
                        onClick={() => startEdit(index)}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remover ingrediente"
                        onClick={() => ingredientsArray.remove(index)}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  )
                )}
              </div>
            )}
            {errors.ingredients?.message && (
              <p className="text-sm text-destructive">{errors.ingredients.message}</p>
            )}
          </div>

          <Separator />

          {/* Autores */}
          <Field orientation="vertical">
            <FieldLabel>Autores</FieldLabel>
            <FieldContent>
              <ComboboxMulti
                options={authorOptions}
                values={getValues("author_ids")}
                onValueChange={(ids) => setValue("author_ids", ids, { shouldValidate: true })}
                placeholder="Selecione os autores (opcional)"
                emptyText="Nenhum autor. Cadastre em /authors/new"
                loading={loadingAuthors}
              />
            </FieldContent>
          </Field>

          {state?.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
        </CardContent>
        <CardFooter className="flex-col gap-3">
          {mode === "edit" && (
            <div className="w-full">
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-1">
                <button
                  type="button"
                  onClick={() => setSaveMode("update")}
                  className={`rounded-lg px-3 py-2 text-[0.7rem] tracking-[0.15em] uppercase transition-colors ${
                    saveMode === "update"
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-400 hover:text-zinc-100"
                  }`}
                >
                  Corrigir
                </button>
                <button
                  type="button"
                  onClick={() => setSaveMode("version")}
                  className={`rounded-lg px-3 py-2 text-[0.7rem] tracking-[0.15em] uppercase transition-colors ${
                    saveMode === "version"
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-400 hover:text-zinc-100"
                  }`}
                >
                  Nova versão
                </button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {saveMode === "update"
                  ? "Correção direta: atualiza esta receita, preservando o histórico das versões anteriores."
                  : "Cria uma nova versão (vN) baseada nestes dados. A receita original é preservada e vira a versão base."}
              </p>
            </div>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : submitLabel}
          </Button>
          <p className="text-xs text-muted-foreground">
            {mode === "edit"
              ? "Receita salva na família de versões (Fase 2)."
              : "Receita salva como versão base (preparada para versionamento na Fase 2)."}
          </p>
        </CardFooter>
      </form>

      <NewIngredientDialog
        open={ingredientDialogOpen}
        onOpenChange={setIngredientDialogOpen}
        onCreated={handleIngredientCreated}
      />
    </Card>
  )
}