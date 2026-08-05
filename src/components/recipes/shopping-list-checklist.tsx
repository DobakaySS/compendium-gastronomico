"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { toggleShoppingListItemAction } from "@/app/actions/shopping"
import { formatAmount } from "@/lib/calculations"

export type ShoppingListItemView = {
  id: string
  ingredientId: string
  name: string
  amount: number
  unit: string
  checked: boolean
}

export function ShoppingListChecklist({
  listId,
  items,
}: {
  listId: string
  items: ShoppingListItemView[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [checkedById, setCheckedById] = React.useState<Record<string, boolean>>(
    () => Object.fromEntries(items.map((i) => [i.id, i.checked]))
  )

  const total = items.length
  const done = Object.values(checkedById).filter(Boolean).length
  const percent = total > 0 ? Math.round((done / total) * 100) : 0

  const handleToggle = (itemId: string, checked: boolean) => {
    setCheckedById((prev) => ({ ...prev, [itemId]: checked }))
    startTransition(async () => {
      const res = await toggleShoppingListItemAction(listId, itemId, checked)
      if (res?.message) toast.error(res.message)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[0.7rem] tracking-[0.2em] uppercase text-zinc-400">
          {done} de {total} comprados
        </p>
        <span className="text-[0.7rem] tracking-[0.2em] uppercase text-zinc-500">
          {percent}%
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full bg-zinc-300 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ul className="space-y-3">
        {items.map((item) => {
          const checked = checkedById[item.id] ?? false
          return (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-3"
            >
              <Checkbox
                checked={checked}
                disabled={pending}
                onCheckedChange={(next) =>
                  handleToggle(item.id, next === true)
                }
                aria-label={`Marcar ${item.name} como ${checked ? "não comprado" : "comprado"}`}
              />
              <span
                className={
                  checked
                    ? "text-sm text-zinc-500 line-through"
                    : "text-sm text-zinc-100"
                }
              >
                {item.name}
              </span>
              <span className="ml-auto shrink-0 text-sm text-zinc-400">
                {formatAmount(item.amount)} {item.unit}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
