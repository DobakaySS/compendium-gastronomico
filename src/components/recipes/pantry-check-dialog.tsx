"use client"

import * as React from "react"
import { PackageSearchIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import {
  calcPantryLines,
  formatAmount,
  formatCurrency,
  type ViewerIngredient,
} from "@/lib/calculations"

type PantryCheckDialogProps = {
  ingredients: ViewerIngredient[]
  servings: number
  baseServings: number
  hasPrices: boolean
}

export function PantryCheckDialog({
  ingredients,
  servings,
  baseServings,
  hasPrices,
}: PantryCheckDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [stock, setStock] = React.useState<Record<string, number>>({})

  // Reseta o estoque ao reabrir
  React.useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => setStock({}), 0)
    return () => window.clearTimeout(t)
  }, [open])

  const lines = React.useMemo(
    () => calcPantryLines(ingredients, servings, baseServings, stock),
    [ingredients, servings, baseServings, stock]
  )

  const totalMissingCost = React.useMemo(
    () => lines.reduce((sum, l) => sum + l.missingCost, 0),
    [lines]
  )

  const totalMissingItems = lines.filter((l) => l.missing > 0).length

  const handleStockChange = (id: string, raw: string) => {
    const parsed = Number(raw)
    setStock((prev) => ({
      ...prev,
      [id]: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
    }))
  }

  return (
    <div className="flex flex-col items-start gap-4">
      <Button
        type="button"
        variant="outline"
        className="h-9 rounded-full px-5 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-200"
        onClick={() => setOpen(true)}
      >
        <PackageSearchIcon className="size-4" />
        Verificar despensa
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Checagem de despensa</DialogTitle>
          <DialogDescription>
            Para {servings} porções — informe o que já tem em estoque para
            calcular o que falta.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto pr-1">
          <ul className="space-y-3">
            {lines.map((line, i) => (
              <li
                key={`${line.ingredient.id}-${i}`}
                className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-zinc-100">
                    {line.ingredient.name}
                  </span>
                  <span className="text-xs text-zinc-500">
                    Necessário:{" "}
                    <span className="text-zinc-300">
                      {formatAmount(line.required)} {line.ingredient.unit}
                    </span>
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <label
                    htmlFor={`stock-${line.ingredient.id}`}
                    className="text-[0.65rem] tracking-[0.15em] uppercase text-zinc-500"
                  >
                    Em estoque
                  </label>
                  <Input
                    id={`stock-${line.ingredient.id}`}
                    type="number"
                    min={0}
                    step="0.1"
                    inputMode="decimal"
                    value={
                      stock[line.ingredient.id] != null
                        ? String(stock[line.ingredient.id])
                        : ""
                    }
                    onChange={(e) =>
                      handleStockChange(line.ingredient.id, e.target.value)
                    }
                    className="h-8 w-24 text-right"
                  />

                  <div className="ml-auto text-right">
                    <p
                      className={`text-xs ${
                        line.missing > 0
                          ? "text-zinc-200"
                          : "text-zinc-500"
                      }`}
                    >
                      {line.missing > 0 ? "Falta" : "OK"} ·{" "}
                      <span className="font-medium">
                        {formatAmount(line.missing)} {line.ingredient.unit}
                      </span>
                    </p>
                    {hasPrices && line.missing > 0 && (
                      <p className="text-xs text-zinc-500">
                        {formatCurrency(line.missingCost, line.ingredient.currency)}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <Separator className="bg-zinc-800" />

        <div className="flex items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
            {totalMissingItems === 0
              ? "Despensa completa"
              : `${totalMissingItems} item(ns) faltando`}
          </p>
          {hasPrices && (
            <p className="text-right">
              <span className="text-[0.65rem] tracking-[0.15em] uppercase text-zinc-500">
                Custo dos faltantes
              </span>
              <span className="ml-2 font-heading text-xl text-zinc-100">
                {formatCurrency(totalMissingCost, ingredients[0]?.currency ?? "BRL")}
              </span>
            </p>
          )}
        </div>

        <DialogFooter className="mt-2 gap-2 sm:justify-end">
          <Button type="button" onClick={() => setOpen(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  )
}
