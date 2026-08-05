"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/crud"
import { ShoppingListSchema } from "@/lib/schema"

export type ShoppingListActionResult = {
  id?: string
  message?: string
}

export async function saveShoppingListAction(input: {
  recipe_id: string
  title: string
  servings: number
  items: Array<{
    ingredient_id: string
    amount: number
    unit: string
  }>
}): Promise<ShoppingListActionResult> {
  const auth = await requireUser()
  if (!auth.ok) return { message: auth.message }

  const parsed = ShoppingListSchema.safeParse(input)
  if (!parsed.success) {
    return { message: "Dados inválidos da lista de compras." }
  }

  const { recipe_id, title, servings, items } = parsed.data

  const { data: list, error: listError } = await auth.supabase
    .from("shopping_lists")
    .insert({ user_id: auth.userId, recipe_id, title, servings })
    .select("id")
    .single()

  if (listError) {
    return { message: listError.message }
  }

  const { error: itemsError } = await auth.supabase
    .from("shopping_list_items")
    .insert(
      items.map((item) => ({
        shopping_list_id: list.id,
        ingredient_id: item.ingredient_id,
        amount: item.amount,
        unit: item.unit,
      }))
    )

  if (itemsError) {
    return { message: itemsError.message }
  }

  revalidatePath("/shopping")
  return { id: list.id }
}

export async function toggleShoppingListItemAction(
  listId: string,
  itemId: string,
  checked: boolean
): Promise<ShoppingListActionResult> {
  const auth = await requireUser()
  if (!auth.ok) return { message: auth.message }

  const { error } = await auth.supabase
    .from("shopping_list_items")
    .update({ checked })
    .eq("id", itemId)

  if (error) {
    return { message: error.message }
  }

  revalidatePath(`/shopping/${listId}`)
  return {}
}

export async function deleteShoppingListAction(
  listId: string
): Promise<ShoppingListActionResult> {
  const auth = await requireUser()
  if (!auth.ok) return { message: auth.message }

  const { error } = await auth.supabase
    .from("shopping_lists")
    .delete()
    .eq("id", listId)

  if (error) {
    return { message: error.message }
  }

  revalidatePath("/shopping")
  redirect("/shopping")
}
