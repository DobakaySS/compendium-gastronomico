"use client"

import { useActionState, useCallback, startTransition, useTransition } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  IngredientSchema,
  type IngredientFormValues,
} from "@/lib/schema"
import { type FormState } from "@/app/actions/ingredients"
import { fetchIngredientMacrosAction } from "@/app/actions/ai-parser"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Field, FieldLabel, FieldContent, FieldError } from "@/components/ui/field"
import { Controller } from "react-hook-form"
import { MEASURABLE_UNITS } from "@/lib/units"
import { SparklesIcon } from "lucide-react"

const UNITS = MEASURABLE_UNITS

type IngredientFormProps = {
  mode?: "create" | "edit"
  action: (
    prev: FormState<{ id: string }>,
    formData: FormData
  ) => Promise<FormState<{ id: string }>>
  defaultValues?: IngredientFormValues & { id?: string }
  submitLabel?: string
}

const EMPTY_DEFAULTS: IngredientFormValues = {
  name: "",
  default_unit: "g",
  grams_per_unit: null,
  kcal_per_100g: null,
  protein_per_100g: null,
  carbs_per_100g: null,
  fat_per_100g: null,
}

export function IngredientForm({
  mode = "create",
  action,
  defaultValues,
  submitLabel = "Cadastrar ingrediente",
}: IngredientFormProps) {
  const [state, formAction, pending] = useActionState<
    FormState<{ id: string }>,
    FormData
  >(action, null)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<IngredientFormValues>({
    resolver: zodResolver(IngredientSchema),
    defaultValues: {
      ...EMPTY_DEFAULTS,
      ...(defaultValues ?? {}),
    },
  })

  const name = useWatch({ control, name: "name" })
  const defaultUnit = useWatch({ control, name: "default_unit" })
  const [fillingMacros, startMacrosTransition] = useTransition()

  const ingredientId = defaultValues?.id

  const fillMacrosWithAI = useCallback(() => {
    const ingredientName = String(name ?? "").trim()
    if (!ingredientName) {
      toast.error("Informe o nome do ingrediente primeiro.")
      return
    }
    startMacrosTransition(async () => {
      const res = await fetchIngredientMacrosAction(ingredientName)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setValue("kcal_per_100g", res.data.kcal_per_100g)
      setValue("protein_per_100g", res.data.protein_per_100g)
      setValue("carbs_per_100g", res.data.carbs_per_100g)
      setValue("fat_per_100g", res.data.fat_per_100g)
      toast.success("Macros estimados pela IA. Revise antes de salvar.")
    })
  }, [name, setValue])

  const onSubmit = useCallback(
    (values: IngredientFormValues) => {
      const fd = new FormData()
      if (ingredientId) fd.set("id", ingredientId)
      fd.set("name", values.name)
      fd.set("default_unit", values.default_unit)
      fd.set("grams_per_unit", String(values.grams_per_unit ?? ""))
      fd.set("kcal_per_100g", String(values.kcal_per_100g ?? ""))
      fd.set("protein_per_100g", String(values.protein_per_100g ?? ""))
      fd.set("carbs_per_100g", String(values.carbs_per_100g ?? ""))
      fd.set("fat_per_100g", String(values.fat_per_100g ?? ""))
      startTransition(() => {
        formAction(fd)
      })
    },
    [formAction, ingredientId]
  )

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>
          {mode === "edit" ? "Editar ingrediente" : "Novo ingrediente"}
        </CardTitle>
        <CardDescription>
          {mode === "edit"
            ? "Atualize o nome, a unidade padrão e os macros por 100g."
            : "Cadastre um ingrediente e seus macros por 100g. Ele fica disponível no catálogo global."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="flex flex-col gap-4">
          <Field orientation="vertical">
            <FieldLabel htmlFor="name">Nome</FieldLabel>
            <FieldContent>
              <Input
                id="name"
                placeholder="ex.: Farinha de trigo"
                {...register("name")}
              />
              <FieldError errors={[{ message: errors.name?.message }]} />
            </FieldContent>
          </Field>

          <Field orientation="vertical">
            <FieldLabel>Unidade padrão</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="default_unit"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
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
                )}
              />
              <FieldError errors={[{ message: errors.default_unit?.message }]} />
            </FieldContent>
          </Field>

          {defaultUnit === "unidade" && (
            <Field orientation="vertical">
              <FieldLabel htmlFor="grams_per_unit">
                Média de g por unidade
              </FieldLabel>
              <FieldContent>
                <Input
                  id="grams_per_unit"
                  type="number"
                  min={0.1}
                  step="0.1"
                  inputMode="decimal"
                  placeholder="ex.: 120"
                  {...register("grams_per_unit", {
                    setValueAs: (v) =>
                      v === "" || v === null || v === undefined
                        ? null
                        : Number(v),
                  })}
                />
                <FieldError
                  errors={[{ message: errors.grams_per_unit?.message }]}
                />
                <p className="text-xs text-zinc-500">
                  Peso médio de uma unidade, para calcular os macros em receitas.
                </p>
              </FieldContent>
            </Field>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Macros por 100g</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={fillingMacros}
              onClick={fillMacrosWithAI}
            >
              <SparklesIcon className="size-3.5" />
              {fillingMacros ? "Buscando..." : "Preencher com IA"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {(
              [
                ["kcal_per_100g", "Kcal / 100g"],
                ["protein_per_100g", "Proteína (g)"],
                ["carbs_per_100g", "Carboidratos (g)"],
                ["fat_per_100g", "Gorduras (g)"],
              ] as const
            ).map(([nameKey, label]) => (
              <Field key={nameKey} orientation="vertical">
                <FieldLabel htmlFor={nameKey}>{label}</FieldLabel>
                <FieldContent>
                  <Input
                    id={nameKey}
                    type="number"
                    min={0}
                    step="0.1"
                    inputMode="decimal"
                    placeholder="0"
                    {...register(nameKey, {
                      setValueAs: (v) =>
                        v === "" || v === null || v === undefined ? null : Number(v),
                    })}
                  />
                  <FieldError
                    errors={[{ message: errors[nameKey]?.message as string | undefined }]}
                  />
                </FieldContent>
              </Field>
            ))}
          </div>

          {state?.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : submitLabel}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
