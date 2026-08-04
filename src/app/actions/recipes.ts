"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/crud"
import { createClient } from "@/lib/supabase/server"
import { RecipeSchema } from "@/lib/schema"

export type FormState<T = unknown> =
  | {
      errors?: Record<string, string[] | undefined>
      message?: string
      data?: T
    }
  | null

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

type RecipePayload = {
  title: string
  base_servings: number
  prep_time_minutes: number
  effort_level: number
  instructions: Array<{ text: string }>
  ingredients: Array<{
    ingredient_id: string
    amount_used: number
    unit: string
  }>
  author_ids: string[]
}

type RecipeParse = ReturnType<typeof RecipeSchema.safeParse>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// FormData sempre entrega strings. Reconstrói os campos dinâmicos.
function parseRecipeFormData(formData: FormData): RecipeParse {
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

  return RecipeSchema.safeParse({
    title,
    base_servings,
    prep_time_minutes,
    effort_level,
    instructions,
    ingredients,
    author_ids,
  })
}

function recipeFields(data: RecipePayload) {
  return {
    title: data.title,
    base_servings: data.base_servings,
    prep_time_minutes: data.prep_time_minutes,
    effort_level: data.effort_level,
    instructions: data.instructions,
  }
}

async function linkIngredients(
  supabase: SupabaseClient,
  recipeId: string,
  data: RecipePayload
): Promise<string | null> {
  if (data.ingredients.length === 0) return null
  const rows = data.ingredients.map((line) => ({
    recipe_id: recipeId,
    ingredient_id: line.ingredient_id,
    amount_used: line.amount_used,
    unit: line.unit,
  }))
  const { error } = await supabase.from("recipe_ingredients").insert(rows)
  return error ? "Erro ao salvar ingredientes da receita." : null
}

async function linkAuthors(
  supabase: SupabaseClient,
  recipeId: string,
  data: RecipePayload
): Promise<string | null> {
  if (data.author_ids.length === 0) return null
  const rows = data.author_ids.map((author_id) => ({
    recipe_id: recipeId,
    author_id,
  }))
  const { error } = await supabase.from("recipe_authors").insert(rows)
  return error ? "Erro ao salvar autores da receita." : null
}

// ---------------------------------------------------------------------------
// saveRecipe — cria, corrige (in-place) ou gera nova versão
// ---------------------------------------------------------------------------

export async function saveRecipe(
  _prev: FormState,
  formData: FormData
): Promise<FormState<{ id: string }>> {
  const auth = await requireRole(["admin", "colaborador"])
  if (!auth.ok) return { message: auth.message }

  const id = String(formData.get("id") ?? "").trim()
  const saveMode = String(formData.get("save_mode") ?? "create")

  const parsed = parseRecipeFormData(formData)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }
  const data = parsed.data as RecipePayload

  if (saveMode === "update") {
    return updateRecipeCore(auth.supabase, id, data)
  }

  if (saveMode === "version") {
    return createVersionCore(auth.supabase, auth.userId, id, data)
  }

  return createRecipeCore(auth.supabase, auth.userId, data)
}

async function createRecipeCore(
  supabase: SupabaseClient,
  userId: string,
  data: RecipePayload
): Promise<FormState<{ id: string }>> {
  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .insert({
      user_id: userId,
      ...recipeFields(data),
      parent_recipe_id: null,
    })
    .select("id")
    .single()

  if (recipeError) {
    return { message: recipeError.message }
  }

  const recipeId = recipe.id

  const ingredientError = await linkIngredients(supabase, recipeId, data)
  if (ingredientError) {
    await supabase.from("recipes").delete().eq("id", recipeId)
    return { message: ingredientError }
  }

  const authorError = await linkAuthors(supabase, recipeId, data)
  if (authorError) {
    await supabase.from("recipes").delete().eq("id", recipeId)
    return { message: authorError }
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

async function updateRecipeCore(
  supabase: SupabaseClient,
  id: string,
  data: RecipePayload
): Promise<FormState<{ id: string }>> {
  const { error: updateError } = await supabase
    .from("recipes")
    .update(recipeFields(data))
    .eq("id", id)

  if (updateError) {
    return { message: updateError.message }
  }

  const { error: delRi } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("recipe_id", id)
  if (delRi) return { message: "Erro ao atualizar ingredientes da receita." }

  const ingredientError = await linkIngredients(supabase, id, data)
  if (ingredientError) return { message: ingredientError }

  const { error: delRa } = await supabase
    .from("recipe_authors")
    .delete()
    .eq("recipe_id", id)
  if (delRa) return { message: "Erro ao atualizar autores da receita." }

  const authorError = await linkAuthors(supabase, id, data)
  if (authorError) return { message: authorError }

  revalidatePath("/", "layout")
  redirect(`/r/${id}`)
}

async function createVersionCore(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  data: RecipePayload
): Promise<FormState<{ id: string }>> {
  const { data: current, error: currentError } = await supabase
    .from("recipes")
    .select("id, parent_recipe_id, version_name")
    .eq("id", id)
    .maybeSingle()

  if (currentError || !current) {
    return { message: "Receita não encontrada." }
  }

  const familyRootId = current.parent_recipe_id ?? current.id

  // Calcula o próximo número de versão entre os membros da família.
  const { data: famRows, error: famError } = await supabase
    .from("recipes")
    .select("id, version_name")
    .or(`parent_recipe_id.eq.${familyRootId},id.eq.${familyRootId}`)

  if (famError) {
    return { message: famError.message }
  }

  const nums = (famRows ?? [])
    .map((row) =>
      parseInt(String(row.version_name ?? "").replace(/\D/g, ""), 10)
    )
    .filter((n) => Number.isFinite(n))
  const maxNum = nums.length > 0 ? Math.max(...nums) : 0
  const versionName = `v${maxNum + 1}`

  // A versão base passa a ser "v1" quando a primeira versão é criada.
  if (!current.version_name) {
    const { error: rootError } = await supabase
      .from("recipes")
      .update({ version_name: "v1" })
      .eq("id", familyRootId)
    if (rootError) {
      return { message: rootError.message }
    }
  }

  const { data: created, error: insertError } = await supabase
    .from("recipes")
    .insert({
      user_id: userId,
      ...recipeFields(data),
      parent_recipe_id: familyRootId,
      version_name: versionName,
    })
    .select("id")
    .single()

  if (insertError) {
    return { message: insertError.message }
  }

  const newId = created.id

  const ingredientError = await linkIngredients(supabase, newId, data)
  if (ingredientError) {
    await supabase.from("recipes").delete().eq("id", newId)
    return { message: ingredientError }
  }

  const authorError = await linkAuthors(supabase, newId, data)
  if (authorError) {
    await supabase.from("recipes").delete().eq("id", newId)
    return { message: authorError }
  }

  revalidatePath("/", "layout")
  redirect(`/r/${newId}`)
}
