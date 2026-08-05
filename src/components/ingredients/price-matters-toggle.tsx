"use client"

import { useTransition } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { toggleIngredientPriceMatters } from "@/app/actions/ingredients"
import { toast } from "sonner"

export function PriceMattersToggle({
  ingredientId,
  checked,
}: {
  ingredientId: string
  checked: boolean
}) {
  const [pending, startTransition] = useTransition()

  const handleChange = (next: boolean) => {
    startTransition(async () => {
      const res = await toggleIngredientPriceMatters(ingredientId, next)
      if (!res.ok) {
        toast.error(res.message ?? "Erro ao atualizar o ingrediente.")
      }
    })
  }

  return (
    <label
      className="flex cursor-pointer items-center gap-2"
      title={
        checked
          ? "Preço é acompanhado (clique para desligar)"
          : "Preço não é acompanhado (clique para ligar)"
      }
    >
      <Checkbox
        checked={checked}
        disabled={pending}
        onCheckedChange={(next) => handleChange(next === true)}
        aria-label={checked ? "Preço é acompanhado" : "Preço não é acompanhado"}
      />
      <span
        className={
          checked
            ? "text-[0.6rem] tracking-[0.15em] uppercase text-zinc-400"
            : "text-[0.6rem] tracking-[0.15em] uppercase text-zinc-600"
        }
      >
        Preço
      </span>
    </label>
  )
}
