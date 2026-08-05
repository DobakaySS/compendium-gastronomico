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
  image_url: string | null
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
  tag_ids: string[]
}

type RecipeParse = ReturnType<typeof RecipeSchema.safeParse>

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Calcula o próximo nome automático "vN" para uma família de versões.
// A base sem nome conta como "v1" (ela vira "v1" ao criar a primeira versão),
// evitando duplicação de nomes na primeira ramificação.
async function nextVersionName(
  famRows: Array<{ id: string; version_name: string | null }>,
  rootVersionName: string | null
): Promise<string> {
  const nums = famRows
    .map((row) =>
      parseInt(String(row.version_name ?? "").replace(/\D/g, ""), 10)
    )
    .filter((n) => Number.isFinite(n))
  if (!rootVersionName) nums.push(1)
  const maxNum = nums.length > 0 ? Math.max(...nums) : 0
  return `v${maxNum + 1}`
}

// FormData sempre entrega strings. Reconstrói os campos dinâmicos.
function parseRecipeFormData(formData: FormData): RecipeParse {
  const title = String(formData.get("title") ?? "")
  const rawImageUrl = String(formData.get("image_url") ?? "").trim()
  const image_url = rawImageUrl === "" ? null : rawImageUrl
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
  const tag_ids = formData
    .getAll("tag_id")
    .map((v) => String(v))
    .filter(Boolean)

  const ingredients = ingredient_ids.map((ingredient_id, index) => ({
    ingredient_id,
    amount_used: amounts[index] ?? 0,
    unit: units[index] ?? "",
  }))

  return RecipeSchema.safeParse({
    title,
    image_url,
    base_servings,
    prep_time_minutes,
    effort_level,
    instructions,
    ingredients,
    author_ids,
    tag_ids,
  })
}

type RecipeFields = {
  title: string
  image_url: string | null
  base_servings: number
  prep_time_minutes: number
  effort_level: number
  instructions: Array<{ text: string }>
  version_name?: string
}

function recipeFields(data: RecipePayload): RecipeFields {
  return {
    title: data.title,
    image_url: data.image_url,
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

async function linkTags(
  supabase: SupabaseClient,
  recipeId: string,
  data: RecipePayload
): Promise<string | null> {
  if (data.tag_ids.length === 0) return null
  const rows = data.tag_ids.map((tag_id) => ({
    recipe_id: recipeId,
    tag_id,
  }))
  const { error } = await supabase.from("recipe_tags").insert(rows)
  return error ? "Erro ao salvar tags da receita." : null
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
  const versionName = String(formData.get("version_name") ?? "").trim()

  const parsed = parseRecipeFormData(formData)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }
  const data = parsed.data as RecipePayload

  if (saveMode === "update") {
    return updateRecipeCore(auth.supabase, id, data, versionName)
  }

  if (saveMode === "version") {
    return createVersionCore(auth.supabase, auth.userId, id, data, versionName)
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

  const tagError = await linkTags(supabase, recipeId, data)
  if (tagError) {
    await supabase.from("recipes").delete().eq("id", recipeId)
    return { message: tagError }
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

async function updateRecipeCore(
  supabase: SupabaseClient,
  id: string,
  data: RecipePayload,
  versionName: string
): Promise<FormState<{ id: string }>> {
  const fields = recipeFields(data)
  if (versionName !== "") {
    fields.version_name = versionName
  }
  const { error: updateError } = await supabase
    .from("recipes")
    .update(fields)
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

  const { error: delRt } = await supabase
    .from("recipe_tags")
    .delete()
    .eq("recipe_id", id)
  if (delRt) return { message: "Erro ao atualizar tags da receita." }

  const tagError = await linkTags(supabase, id, data)
  if (tagError) return { message: tagError }

  revalidatePath("/", "layout")
  redirect(`/r/${id}`)
}

async function createVersionCore(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  data: RecipePayload,
  versionName: string
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

  const resolvedName =
    versionName !== ""
      ? versionName
      : await nextVersionName(famRows ?? [], current.version_name)

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
      version_name: resolvedName,
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

  const tagError = await linkTags(supabase, newId, data)
  if (tagError) {
    await supabase.from("recipes").delete().eq("id", newId)
    return { message: tagError }
  }

  revalidatePath("/", "layout")
  redirect(`/r/${newId}`)
}
