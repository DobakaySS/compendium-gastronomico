import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { AppHeader } from "@/components/layout/app-header"
import { IngredientForm } from "@/components/ingredients/ingredient-form"
import { updateIngredient } from "@/app/actions/ingredients"
import { userRole, canWrite } from "@/lib/roles"
import type { IngredientFormValues } from "@/lib/schema"

type IngredientRow = {
  id: string
  name: string
  default_unit: string | null
  kcal_per_100g: number | null
  protein_per_100g: number | null
  carbs_per_100g: number | null
  fat_per_100g: number | null
}

export default async function EditIngredientPage({
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
    redirect("/ingredients")
  }

  const { data: ingredient, error } = await supabase
    .from("ingredients")
    .select(
      "id, name, default_unit, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g"
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !ingredient) {
    notFound()
  }

  const row = ingredient as IngredientRow
  const defaults: IngredientFormValues & { id: string } = {
    id: row.id,
    name: row.name,
    default_unit: row.default_unit ?? "g",
    kcal_per_100g: row.kcal_per_100g != null ? Number(row.kcal_per_100g) : null,
    protein_per_100g: row.protein_per_100g != null ? Number(row.protein_per_100g) : null,
    carbs_per_100g: row.carbs_per_100g != null ? Number(row.carbs_per_100g) : null,
    fat_per_100g: row.fat_per_100g != null ? Number(row.fat_per_100g) : null,
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <span className="text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
          Catálogo
        </span>
        <h1 className="mt-2 font-heading text-3xl text-zinc-50">
          Editar ingrediente
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ajuste os macros por 100g — ou use a IA para estimá-los.
        </p>
        <div className="mt-8">
          <Suspense>
            <IngredientForm
              mode="edit"
              action={updateIngredient}
              defaultValues={defaults}
              submitLabel="Salvar alterações"
            />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
