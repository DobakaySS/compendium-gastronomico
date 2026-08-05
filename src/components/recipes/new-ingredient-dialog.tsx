"use client"

import { useEffect, useRef, useState } from "react"
import { useActionState } from "react"
import { createIngredientQuick, type FormState } from "@/app/actions/ingredients"
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
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MEASURABLE_UNITS } from "@/lib/units"

const UNITS = MEASURABLE_UNITS

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string) => void
}

export function NewIngredientDialog({ open, onOpenChange, onCreated }: Props) {
  const [state, formAction, pending] = useActionState<
    FormState<{ id: string }>,
    FormData
  >(createIngredientQuick, null)

  const [name, setName] = useState("")
  const [defaultUnit, setDefaultUnit] = useState<string>(UNITS[0])
  const [gramsPerUnit, setGramsPerUnit] = useState("")
  const [macros, setMacros] = useState<Record<string, string>>({
    kcal_per_100g: "",
    protein_per_100g: "",
    carbs_per_100g: "",
    fat_per_100g: "",
  })
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => {
      setName("")
      setDefaultUnit(UNITS[0])
      setGramsPerUnit("")
      setMacros({
        kcal_per_100g: "",
        protein_per_100g: "",
        carbs_per_100g: "",
        fat_per_100g: "",
      })
      nameRef.current?.focus()
    }, 50)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (state?.data?.id) {
      onCreated(state.data.id)
      onOpenChange(false)
    }
  }, [state, onCreated, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo ingrediente</DialogTitle>
          <DialogDescription>
            Cadastre rapidamente um ingrediente para usá-lo na receita.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="default_unit" value={defaultUnit} />
          <Field orientation="vertical">
            <FieldLabel htmlFor="new-ing-name">Nome</FieldLabel>
            <FieldContent>
              <Input
                id="new-ing-name"
                ref={nameRef}
                name="name"
                placeholder="ex.: Farinha de trigo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <FieldError errors={state?.errors?.name?.map((m) => ({ message: m }))} />
            </FieldContent>
          </Field>

          <Field orientation="vertical">
            <FieldLabel>Unidade padrão</FieldLabel>
            <FieldContent>
              <Select value={defaultUnit} onValueChange={(v) => setDefaultUnit(v ?? UNITS[0])}>
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

          {defaultUnit === "unidade" && (
            <Field orientation="vertical">
              <FieldLabel htmlFor="new-ing-grams-per-unit">
                Média de g por unidade
              </FieldLabel>
              <FieldContent>
                <Input
                  id="new-ing-grams-per-unit"
                  name="grams_per_unit"
                  type="number"
                  min={0.1}
                  step="0.1"
                  inputMode="decimal"
                  placeholder="ex.: 120"
                  value={gramsPerUnit}
                  onChange={(e) => setGramsPerUnit(e.target.value)}
                  required
                />
                <FieldError
                  errors={[{ message: state?.errors?.grams_per_unit?.[0] }]}
                />
                <p className="text-xs text-zinc-500">
                  Peso médio de uma unidade, para calcular os macros em receitas.
                </p>
              </FieldContent>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["kcal_per_100g", "Kcal / 100g"],
                ["protein_per_100g", "Proteína (g)"],
                ["carbs_per_100g", "Carboidratos (g)"],
                ["fat_per_100g", "Gorduras (g)"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} orientation="vertical">
                <FieldLabel htmlFor={`new-ing-${key}`}>{label}</FieldLabel>
                <FieldContent>
                  <Input
                    id={`new-ing-${key}`}
                    name={key}
                    type="number"
                    min={0}
                    step="0.1"
                    inputMode="decimal"
                    placeholder="0"
                    value={macros[key]}
                    onChange={(e) =>
                      setMacros((m) => ({ ...m, [key]: e.target.value }))
                    }
                  />
                  <FieldError
                    errors={[{ message: state?.errors?.[key]?.[0] }]}
                  />
                </FieldContent>
              </Field>
            ))}
          </div>

          {state?.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}

          <DialogFooter className="mt-2 gap-2 sm:justify-between">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Cadastrar ingrediente"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}