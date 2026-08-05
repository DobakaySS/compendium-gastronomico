import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppHeader } from "@/components/layout/app-header"
import { formatDate } from "@/lib/format-date"

type ListRow = {
  id: string
  title: string
  servings: number | null
  created_at: string | null
  recipe_title: string | null
  total: number
  done: number
}

export const revalidate = 0

export default async function ShoppingListsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: lists } = await supabase
    .from("shopping_lists")
    .select(
      `id,
       title,
       servings,
       created_at,
       recipes(title),
       shopping_list_items(id, checked)`
    )
    .order("created_at", { ascending: false })

  const rows: ListRow[] = (lists ?? []).map((l) => {
    const items = (l.shopping_list_items ?? []) as Array<{
      checked: boolean
    }>
    const recipe =
      l.recipes && !Array.isArray(l.recipes)
        ? (l.recipes as { title?: string } | null)?.title ?? null
        : null
    return {
      id: l.id as string,
      title: l.title as string,
      servings: l.servings as number | null,
      created_at: l.created_at as string | null,
      recipe_title: recipe,
      total: items.length,
      done: items.filter((i) => i.checked).length,
    }
  })

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">
        <span className="text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
          Estúdio
        </span>
        <h1 className="mt-2 font-heading text-3xl text-zinc-50 sm:text-4xl">
          Listas de compras
        </h1>
        <p className="mt-2 max-w-md text-sm text-zinc-400">
          Suas listas geradas a partir da checagem de estoque das receitas.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-zinc-800 px-6 py-20 text-center">
              <h2 className="font-heading text-2xl text-zinc-200">
                Nenhuma lista ainda
              </h2>
              <p className="max-w-sm text-sm text-zinc-500">
                Abra uma receita, marque o que já tem em estoque e gere sua
                primeira lista de compras.
              </p>
            </div>
          ) : (
            rows.map((row) => (
              <Link
                key={row.id}
                href={`/shopping/${row.id}`}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-5 py-5 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
              >
                <div className="min-w-0">
                  <p className="font-heading text-lg text-zinc-100">
                    {row.title}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {row.recipe_title ?? "Receita"} · {row.total} item(ns) ·{" "}
                    {row.done} comprados
                    {row.created_at ? ` · ${formatDate(row.created_at)}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-zinc-600 transition-colors group-hover:text-zinc-300">
                  →
                </span>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
