import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppHeader } from "@/components/layout/app-header"
import {
  ShoppingListChecklist,
  type ShoppingListItemView,
} from "@/components/recipes/shopping-list-checklist"
import { DeleteShoppingListButton } from "@/components/recipes/delete-shopping-list-button"
import { formatDate } from "@/lib/format-date"

export const revalidate = 0

export default async function ShoppingListDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: list } = await supabase
    .from("shopping_lists")
    .select("id, title, servings, created_at, recipes(title)")
    .eq("id", id)
    .maybeSingle()

  if (!list) {
    notFound()
  }

  const { data: itemRows } = await supabase
    .from("shopping_list_items")
    .select("id, ingredient_id, amount, unit, checked, ingredients(name)")
    .eq("shopping_list_id", id)

  const items: ShoppingListItemView[] = (itemRows ?? []).map((i) => {
    const ingredient =
      i.ingredients && !Array.isArray(i.ingredients)
        ? (i.ingredients as { name?: string } | null)
        : null
    return {
      id: i.id as string,
      ingredientId: i.ingredient_id as string,
      name: ingredient?.name ?? "Ingrediente",
      amount: Number(i.amount),
      unit: i.unit as string,
      checked: i.checked as boolean,
    }
  })

  const recipeTitle =
    list.recipes && !Array.isArray(list.recipes)
      ? (list.recipes as { title?: string } | null)?.title ?? null
      : null

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:py-12">
        <Link
          href="/shopping"
          className="inline-flex items-center gap-1 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-500 transition-colors hover:text-zinc-200"
        >
          ← Listas de compras
        </Link>

        <h1 className="mt-4 font-heading text-3xl text-zinc-50 sm:text-4xl">
          {list.title}
        </h1>
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-zinc-500">
          {recipeTitle ?? "Receita"}
          {list.servings != null && ` · ${list.servings} porções`}
          {list.created_at ? ` · ${formatDate(list.created_at)}` : ""}
        </p>

        <div className="mt-8">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
              <p className="text-sm text-zinc-500">
                Esta lista não tem itens.
              </p>
            </div>
          ) : (
            <ShoppingListChecklist listId={id} items={items} />
          )}
        </div>

        <div className="mt-10">
          <DeleteShoppingListButton listId={id} />
        </div>
      </main>
    </div>
  )
}
