import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { AppHeader } from "@/components/layout/app-header"
import { RecipeBuilder } from "@/components/recipes/recipe-builder"
import { userRole, canWrite } from "@/lib/roles"
import type { RecipeFormValues } from "@/lib/schema"

type RecipeRow = {
  id: string
  title: string
  base_servings: number | null
  prep_time_minutes: number | null
  effort_level: number | null
  instructions: Array<string | { text: string }> | null
  recipe_ingredients: Array<{
    ingredient_id: string
    amount_used: number | null
    unit: string | null
  }>
  recipe_authors: Array<{ author_id: string }>
}

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !canWrite(userRole(user))) {
    redirect("/")
  }

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select(
      `id,
       title,
       base_servings,
       prep_time_minutes,
       effort_level,
       instructions,
       recipe_ingredients(ingredient_id, amount_used, unit),
       recipe_authors(author_id)`
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !recipe) {
    notFound()
  }

  const row = recipe as unknown as RecipeRow

  const initialData: RecipeFormValues = {
    title: row.title,
    base_servings: Number(row.base_servings ?? 4),
    prep_time_minutes: Number(row.prep_time_minutes ?? 30),
    effort_level: Number(row.effort_level ?? 3),
    instructions: (row.instructions ?? []).map((step) =>
      typeof step === "string" ? { text: step } : step
    ),
    ingredients: (row.recipe_ingredients ?? []).map((ri) => ({
      ingredient_id: ri.ingredient_id,
      amount_used: Number(ri.amount_used ?? 0),
      unit: ri.unit ?? "g",
    })),
    author_ids: (row.recipe_authors ?? []).map((a) => a.author_id),
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Link
          href={`/r/${id}`}
          className="mb-6 inline-flex items-center gap-1 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-500 transition-colors hover:text-zinc-200"
        >
          ← Voltar à receita
        </Link>
        <span className="text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
          Estúdio
        </span>
        <h1 className="mt-2 font-heading text-3xl text-zinc-50">
          Editar receita
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Corrija a receita diretamente ou gere uma nova versão (vN) com as
          alterações.
        </p>
        <div className="mt-8">
          <Suspense>
            <RecipeBuilder
              mode="edit"
              recipeId={id}
              initialData={initialData}
              submitLabel="Salvar receita"
            />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
