"use client"

import { useActionState, useEffect, useRef } from "react"
import dayjs from "dayjs"
import { toast } from "sonner"
import { logPrice, type FormState } from "@/app/actions/prices"
import { CITIES } from "@/lib/cities"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldLabel, FieldContent, FieldError } from "@/components/ui/field"
import { PlusIcon } from "lucide-react"

const REFERENCE_UNITS = ["g", "kg", "ml", "L"] as const

type PriceFormProps = {
  ingredientId: string
}

export function PriceForm({ ingredientId }: PriceFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    logPrice,
    null
  )

  useEffect(() => {
    if (state?.data) {
      toast.success("Preço registrado.")
      formRef.current?.reset()
    }
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="ingredient_id" value={ingredientId} />

      <input
        type="hidden"
        name="recorded_on"
        value={dayjs().format("YYYY-MM-DD")}
        readOnly
      />

      <Field>
        <FieldLabel>Cidade *</FieldLabel>
        <FieldContent>
          <Select name="city" defaultValue={CITIES[0]}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CITIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state?.errors?.city?.[0] && (
            <FieldError>{state.errors.city[0]}</FieldError>
          )}
        </FieldContent>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel>Preço (R$) *</FieldLabel>
          <FieldContent>
            <Input
              name="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex: 8.90"
            />
            {state?.errors?.price?.[0] && (
              <FieldError>{state.errors.price[0]}</FieldError>
            )}
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel>Quantidade de referência *</FieldLabel>
          <FieldContent>
            <Input
              name="reference_amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="1000"
              defaultValue={1000}
            />
            {state?.errors?.reference_amount?.[0] && (
              <FieldError>{state.errors.reference_amount[0]}</FieldError>
            )}
          </FieldContent>
        </Field>
      </div>

      <Field>
        <FieldLabel>Unidade de referência *</FieldLabel>
        <FieldContent>
          <Select name="reference_unit" defaultValue="g">
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REFERENCE_UNITS.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state?.errors?.reference_unit?.[0] && (
            <FieldError>{state.errors.reference_unit[0]}</FieldError>
          )}
        </FieldContent>
      </Field>

      <div className="flex items-center justify-between gap-4">
        <p className="text-[0.65rem] text-zinc-500">
          Data de hoje: {dayjs().format("DD/MM/YYYY")}
        </p>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          <PlusIcon className="mr-1 size-3.5" />
          {pending ? "Registrando..." : "Registrar preço"}
        </Button>
      </div>

      {state?.message && (
        <p className="text-xs text-red-400">{state.message}</p>
      )}
    </form>
  )
}
