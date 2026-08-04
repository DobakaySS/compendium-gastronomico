import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { AppHeader } from "@/components/layout/app-header"
import { Separator } from "@/components/ui/separator"

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select(
      `title,
       image_url,
       techniques,
       base_servings,
       prep_time_minutes,
       effort_level,
       instructions,
       recipe_authors(author_id, authors(name)),
       recipe_ingredients(ingredient_id, amount_used, unit, ingredients(name))`
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !recipe) {
    notFound()
  }

  const instructions = Array.isArray(recipe.instructions)
    ? recipe.instructions
    : []

  const instructionText = (raw: unknown): string => {
    if (typeof raw === "string") return raw
    if (raw && typeof raw === "object" && "text" in raw) {
      return String((raw as { text: string }).text)
    }
    return ""
  }

  const authors = (recipe.recipe_authors as Array<{ authors: unknown }>)
    .map((a) => {
      const rows = Array.isArray(a.authors) ? a.authors : [a.authors]
      return rows.map((r) => (r as { name?: string } | null)?.name ?? "")
    })
    .flat()
    .filter(Boolean) as string[]

  const items = recipe.recipe_ingredients as Array<{
    amount_used: number | null
    unit: string | null
    ingredients: unknown
  }>

  const ingredientName = (raw: unknown): string => {
    const rows = Array.isArray(raw) ? raw : [raw]
    return (rows[0] as { name?: string } | null)?.name ?? ""
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-500 transition-colors hover:text-zinc-200"
        >
          ← Voltar às receitas
        </Link>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-zinc-900 ring-1 ring-zinc-800">
          {recipe.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recipe.image_url}
              alt={recipe.title}
              className="aspect-[16/10] w-full object-cover"
            />
          ) : (
            <div className="aspect-[16/10] w-full bg-[radial-gradient(120%_120%_at_50%_10%,#33415533_0%,#0c0c0f_65%)]" />
          )}
        </div>

        {/* Título + meta */}
        <div className="mt-8 text-center">
          <h1 className="font-heading text-4xl text-zinc-50 sm:text-5xl [text-wrap:balance]">
            {recipe.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-500">
            <span>{recipe.prep_time_minutes ?? "—"} min</span>
            <span aria-hidden className="text-zinc-700">·</span>
            <span>{recipe.base_servings ?? "—"} porções</span>
            <span aria-hidden className="text-zinc-700">·</span>
            <span>Esforço {recipe.effort_level ?? "—"}/5</span>
          </div>
        </div>

        {/* Autores */}
        {authors.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-zinc-800 text-sm font-medium text-zinc-100 ring-1 ring-zinc-700">
              {authors[0].charAt(0).toUpperCase()}
            </span>
            <div className="text-left">
              <p className="text-[0.7rem] tracking-[0.25em] uppercase text-zinc-100">
                {authors.join(" · ")}
              </p>
              <p className="text-xs text-zinc-500">Autor(es)</p>
            </div>
          </div>
        )}

        <div className="mt-10 flex flex-col gap-10">
          {/* Ingredientes */}
          <section>
            <h2 className="mb-4 text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
              Ingredientes
            </h2>
            <ul className="space-y-4">
              {items.map((item, i) => (
                <li key={i} className="flex items-baseline justify-between gap-4 border-b border-zinc-800/70 pb-3">
                  <span className="text-sm text-zinc-100">
                    {ingredientName(item.ingredients)}
                  </span>
                  <span className="shrink-0 text-sm text-zinc-400">
                    {item.amount_used ?? "—"} {item.unit}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <Separator className="bg-zinc-800" />

          {/* Preparo */}
          <section>
            <h2 className="mb-4 text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
              Preparo
            </h2>
            <ol className="space-y-6">
              {instructions.map((step: unknown, i: number) => (
                <li key={i} className="flex gap-5">
                  <span className="font-heading text-lg text-zinc-500">{i + 1}</span>
                  <p className="text-sm leading-relaxed text-zinc-200">
                    {instructionText(step)}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
    </div>
  )
}