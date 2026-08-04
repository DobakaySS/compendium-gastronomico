"use client"

import { useActionState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  IngredientSchema,
  type IngredientFormValues,
} from "@/lib/schema"
import { createIngredient, type FormState } from "@/app/actions/ingredients"
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

const UNITS = ["g", "kg", "ml", "l", "unidade", "xícara", "colher (sopa)", "colher (chá)"] as const

export function IngredientForm() {
  const [state, formAction, pending] = useActionState<
    FormState<{ id: string }>,
    FormData
  >(createIngredient, null)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<IngredientFormValues>({
    resolver: zodResolver(IngredientSchema),
    defaultValues: {
      name: "",
      default_unit: "g",
      kcal_per_100g: null,
      protein_per_100g: null,
      carbs_per_100g: null,
      fat_per_100g: null,
    },
  })

  const onSubmit = useCallback(
    (values: IngredientFormValues) => {
      const fd = new FormData()
      fd.set("name", values.name)
      fd.set("default_unit", values.default_unit)
      fd.set("kcal_per_100g", String(values.kcal_per_100g ?? ""))
      fd.set("protein_per_100g", String(values.protein_per_100g ?? ""))
      fd.set("carbs_per_100g", String(values.carbs_per_100g ?? ""))
      fd.set("fat_per_100g", String(values.fat_per_100g ?? ""))
      formAction(fd)
    },
    [formAction]
  )

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Novo ingrediente</CardTitle>
        <CardDescription>
          Cadastre um ingrediente e seus macros por 100g. Ele fica disponível
          no catálogo global.
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

          <div className="grid grid-cols-2 gap-4">
            {(
              [
                ["kcal_per_100g", "Kcal / 100g"],
                ["protein_per_100g", "Proteína (g)"],
                ["carbs_per_100g", "Carboidratos (g)"],
                ["fat_per_100g", "Gorduras (g)"],
              ] as const
            ).map(([name, label]) => (
              <Field key={name} orientation="vertical">
                <FieldLabel htmlFor={name}>{label}</FieldLabel>
                <FieldContent>
                  <Input
                    id={name}
                    type="number"
                    min={0}
                    step="0.1"
                    inputMode="decimal"
                    placeholder="0"
                    {...register(name, {
                      setValueAs: (v) =>
                        v === "" || v === null || v === undefined ? null : Number(v),
                    })}
                  />
                  <FieldError
                    errors={[{ message: errors[name]?.message as string | undefined }]}
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
            {pending ? "Salvando..." : "Cadastrar ingrediente"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}