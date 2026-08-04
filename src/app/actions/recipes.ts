"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/crud"
import { RecipeSchema } from "@/lib/schema"

export type FormState<T = unknown> =
  | {
      errors?: Record<string, string[] | undefined>
      message?: string
      data?: T
    }
  | null

export async function createRecipe(
  _prev: FormState,
  formData: FormData
): Promise<FormState<{ id: string }>> {
  const auth = await requireRole(["admin", "colaborador"])
  if (!auth.ok) return { message: auth.message }

  // Reconstrução dos campos dinâmicos a partir do FormData.
  const title = String(formData.get("title") ?? "")
  const base_servings = Number(String(formData.get("base_servings") ?? ""))
  const prep_time_minutes = Number(String(formData.get("prep_time_minutes") ?? ""))
  const effort_level = Number(String(formData.get("effort_level") ?? ""))
  const instructions = formData
    .getAll("instructions")
    .map((v) => ({ text: String(v) }))
    .filter((v) => v.text.trim() !== "")
  const ingredient_ids = formData
    .getAll("ingredient_id")
    .map((v) => String(v))
  const amounts = formData
    .getAll("amount_used")
    .map((v) => Number(String(v)))
  const units = formData.getAll("unit").map((v) => String(v))
  const author_ids = formData
    .getAll("author_id")
    .map((v) => String(v))
    .filter(Boolean)

  const ingredients = ingredient_ids.map((ingredient_id, index) => ({
    ingredient_id,
    amount_used: amounts[index] ?? 0,
    unit: units[index] ?? "",
  }))

  const parsed = RecipeSchema.safeParse({
    title,
    base_servings,
    prep_time_minutes,
    effort_level,
    instructions,
    ingredients,
    author_ids,
  })

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const data = parsed.data

  // 1. Insere a receita base.
  const { data: recipe, error: recipeError } = await auth.supabase
    .from("recipes")
    .insert({
      user_id: auth.userId,
      title: data.title,
      base_servings: data.base_servings,
      prep_time_minutes: data.prep_time_minutes,
      effort_level: data.effort_level,
      instructions: data.instructions,
      parent_recipe_id: null,
    })
    .select("id")
    .single()

  if (recipeError) {
    return { message: recipeError.message }
  }

  const recipeId = recipe.id

  // 2. Insere os ingredientes (sequencial, com limpeza parcial em caso de erro).
  const ingredientRows = data.ingredients.map((line) => ({
    recipe_id: recipeId,
    ingredient_id: line.ingredient_id,
    amount_used: line.amount_used,
    unit: line.unit,
  }))

  if (ingredientRows.length > 0) {
    const { error: riError } = await auth.supabase
      .from("recipe_ingredients")
      .insert(ingredientRows)

    if (riError) {
      await auth.supabase.from("recipes").delete().eq("id", recipeId)
      return { message: "Erro ao salvar ingredientes da receita." }
    }
  }

  // 3. Insere os autores (se houver).
  if (data.author_ids.length > 0) {
    const authorRows = data.author_ids.map((author_id) => ({
      recipe_id: recipeId,
      author_id,
    }))
    const { error: raError } = await auth.supabase
      .from("recipe_authors")
      .insert(authorRows)

    if (raError) {
      await auth.supabase.from("recipes").delete().eq("id", recipeId)
      return { message: "Erro ao salvar autores da receita." }
    }
  }

  revalidatePath("/")
  redirect("/dashboard")
}