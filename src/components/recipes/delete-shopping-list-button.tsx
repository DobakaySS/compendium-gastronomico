"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { deleteShoppingListAction } from "@/app/actions/shopping"

export function DeleteShoppingListButton({ listId }: { listId: string }) {
  const [pending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteShoppingListAction(listId)
      if (res?.message) toast.error(res.message)
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="text-zinc-400"
      disabled={pending}
      onClick={handleDelete}
    >
      {pending ? "Excluindo..." : "Excluir lista"}
    </Button>
  )
}
