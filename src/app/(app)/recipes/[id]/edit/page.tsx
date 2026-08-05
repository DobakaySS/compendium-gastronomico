import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { RecipeBuilder } from "@/components/recipes/recipe-builder"
import { VersionSwitcher, type VersionOption } from "@/components/recipes/version-switcher"
import { userRole, canWrite } from "@/lib/roles"
import type { RecipeFormValues } from "@/lib/schema"

type RecipeRow = {
  id: string
  title: string
  image_url: string | null
  base_servings: number | null
  prep_time_minutes: number | null
  effort_level: number | null
  instructions: Array<string | { text: string }> | null
  parent_recipe_id: string | null
  version_name: string | null
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
       image_url,
       base_servings,
       prep_time_minutes,
       effort_level,
       instructions,
       parent_recipe_id,
       version_name,
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
    image_url: row.image_url,
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

  // --- Família de versões + sugestão do próximo nome automático -----------
  const familyRootId = row.parent_recipe_id ?? row.id

  const { data: familyRows, error: familyError } = await supabase
    .from("recipes")
    .select("id, title, version_name")
    .or(`parent_recipe_id.eq.${familyRootId},id.eq.${familyRootId}`)
    .order("created_at", { ascending: true })

  if (familyError) {
    throw new Error(familyError.message)
  }

  const versions: VersionOption[] = (familyRows ?? []).map((v) => ({
    id: v.id,
    title: v.title,
    version_name: v.version_name,
  }))

  const nums = (familyRows ?? [])
    .map((v) =>
      parseInt(String(v.version_name ?? "").replace(/\D/g, ""), 10)
    )
    .filter((n) => Number.isFinite(n))
  if (!row.version_name) nums.push(1)
  const suggestedVersionName = `v${(nums.length > 0 ? Math.max(...nums) : 0) + 1}`

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <Link
          href={`/r/${id}`}
          className="mb-6 inline-flex items-center gap-1 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-500 transition-colors hover:text-zinc-200"
        >
          ← Voltar à receita
        </Link>
        <h1 className="mt-2 font-heading text-3xl text-zinc-50">
          Editar receita
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Você está editando a versão{" "}
          <span className="text-zinc-300">
            {row.version_name ?? "Base"}
          </span>
          . Troque a versão no seletor para editar outra, corrija-a diretamente
          ou gere uma nova versão com nome livre.
        </p>
        <div className="mt-8 flex flex-col gap-6">
          <VersionSwitcher versions={versions} currentId={row.id} />
          <Suspense>
            <RecipeBuilder
              key={row.id}
              mode="edit"
              recipeId={row.id}
              initialData={initialData}
              initialVersionName={row.version_name ?? ""}
              suggestedVersionName={suggestedVersionName}
              submitLabel="Salvar receita"
            />
          </Suspense>
        </div>
      </main>
  )
}
