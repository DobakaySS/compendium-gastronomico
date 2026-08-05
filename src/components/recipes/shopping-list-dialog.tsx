"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { ShoppingBagIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { saveShoppingListAction } from "@/app/actions/shopping"
import {
  calcPantryLines,
  formatAmount,
  formatCurrency,
  round,
  type ViewerIngredient,
} from "@/lib/calculations"

type ShoppingListDialogProps = {
  recipeId: string
  recipeTitle: string
  ingredients: ViewerIngredient[]
  servings: number
  baseServings: number
}

function formatNameList(names: string[]): string {
  if (names.length === 0) return ""
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`
}

export function ShoppingListDialog({
  recipeId,
  recipeTitle,
  ingredients,
  servings,
  baseServings,
}: ShoppingListDialogProps) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [stock, setStock] = React.useState<Record<string, number>>({})
  const [pending, startTransition] = useTransition()

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

  const shoppingItems = lines.filter((line) => line.missing > 0.001)
  const pricedItems = shoppingItems.filter(
    (line) => line.ingredient.price != null
  )
  const unpricedItems = shoppingItems.filter(
    (line) => line.ingredient.price == null
  )
  const expectedTotal = pricedItems.reduce(
    (sum, line) => sum + line.missingCost,
    0
  )
  const unpricedNames = unpricedItems.map((line) => line.ingredient.name)

  const handleStockChange = (id: string, raw: string) => {
    const parsed = Number(raw)
    setStock((prev) => ({
      ...prev,
      [id]: Number.isFinite(parsed) && parsed >= 0 ? parsed : 0,
    }))
  }

  const handleToggleHave = (id: string, required: number, checked: boolean) => {
    setStock((prev) => ({
      ...prev,
      [id]: checked ? required : 0,
    }))
  }

  const handleGenerate = () => {
    if (shoppingItems.length === 0) {
      toast.success("Despensa completa — nada a comprar!")
      return
    }

    startTransition(async () => {
      const res = await saveShoppingListAction({
        recipe_id: recipeId,
        title: `${recipeTitle} · ${servings} porções`,
        servings,
        items: shoppingItems.map((line) => ({
          ingredient_id: line.ingredient.id,
          amount: round(line.missing),
          unit: line.ingredient.unit,
        })),
      })

      if (res?.message) {
        toast.error(res.message)
        return
      }

      setOpen(false)
      router.push(`/shopping/${res.id}`)
      router.refresh()
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-8 rounded-full px-3 text-[0.65rem] tracking-[0.15em] uppercase text-zinc-200"
        onClick={() => setOpen(true)}
      >
        <ShoppingBagIcon className="size-3.5" />
        Lista de compras
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Lista de compras</DialogTitle>
            <DialogDescription>
              Para {servings} porções — marque o que já tem em estoque para
              gerar apenas o que falta.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[50vh] overflow-y-auto pr-1">
            <ul className="space-y-3">
              {lines.map((line, i) => {
                const have = line.inStock >= line.required
                return (
                  <li
                    key={`${line.ingredient.id}-${i}`}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={have}
                        onCheckedChange={(next) =>
                          handleToggleHave(
                            line.ingredient.id,
                            line.required,
                            next === true
                          )
                        }
                        aria-label={`Tenho ${line.ingredient.name}`}
                      />
                      <span
                        className={
                          have
                            ? "text-sm text-zinc-500 line-through"
                            : "text-sm text-zinc-100"
                        }
                      >
                        {line.ingredient.name}
                      </span>
                      <span className="ml-auto shrink-0 text-xs text-zinc-500">
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
                        Tenho
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
                            have ? "text-zinc-500" : "text-zinc-200"
                          }`}
                        >
                          {have ? "OK" : "Falta"} ·{" "}
                          <span className="font-medium">
                            {formatAmount(line.missing)} {line.ingredient.unit}
                          </span>
                        </p>
                        {!have &&
                          line.missing > 0 &&
                          line.ingredient.price != null && (
                            <p className="text-xs text-zinc-500">
                              {formatCurrency(
                                line.missingCost,
                                line.ingredient.currency
                              )}
                            </p>
                          )}
                        {!have &&
                          line.missing > 0 &&
                          line.ingredient.price == null && (
                            <p className="text-xs text-zinc-600">
                              preço não cadastrado
                            </p>
                          )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          <DialogFooter className="mt-2 gap-2 sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-xs uppercase tracking-[0.15em] text-zinc-500">
                {shoppingItems.length === 0
                  ? "Despensa completa"
                  : `${shoppingItems.length} item(ns) para comprar`}
              </p>
              {shoppingItems.length > 0 && (
                <>
                  {unpricedItems.length > 0 && (
                    <p className="text-xs text-zinc-600">
                      Não temos o preço cadastrado para{" "}
                      {formatNameList(unpricedNames)}.
                    </p>
                  )}
                  <p className="text-sm text-zinc-400">
                    Valor esperado:{" "}
                    <span className="font-heading text-lg text-zinc-100">
                      {pricedItems.length > 0
                        ? formatCurrency(expectedTotal)
                        : "—"}
                    </span>
                    {unpricedItems.length > 0 && (
                      <span className="text-xs text-zinc-600">
                        {" "}
                        (sem contar os não cadastrados)
                      </span>
                    )}
                  </p>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Fechar
              </Button>
              <Button
                type="button"
                disabled={pending}
                onClick={handleGenerate}
              >
                {pending ? "Gerando..." : "Gerar lista de compras"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
