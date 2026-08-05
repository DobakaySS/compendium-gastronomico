"use server"

import { revalidatePath } from "next/cache"
import { requireRole, requireUser } from "@/lib/crud"
import { RecipeLogSchema, EditRecipeLogSchema } from "@/lib/schema"

export type FormState<T = unknown> =
  | {
      errors?: Record<string, string[] | undefined>
      message?: string
      data?: T
    }
  | null

export async function addRecipeLogAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState<{ id: string }>> {
  const auth = await requireRole(["admin", "colaborador"])
  if (!auth.ok) return { message: auth.message }

  const raw: Record<string, string> = {}
  for (const [key, value] of formData.entries()) {
    raw[key] = String(value).trim()
  }

  const parsed = RecipeLogSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { recipe_id, author_id, note } = parsed.data

  const { error } = await auth.supabase
    .from("recipe_logs")
    .insert({ recipe_id, author_id, note, user_id: auth.userId })

  if (error) {
    return { message: error.message }
  }

  revalidatePath(`/r/${recipe_id}`)

  return { data: { id: recipe_id } }
}

export async function updateRecipeLogAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState<{ id: string }>> {
  const auth = await requireUser()
  if (!auth.ok) return { message: auth.message }

  const raw: Record<string, string> = {}
  for (const [key, value] of formData.entries()) {
    raw[key] = String(value).trim()
  }

  const parsed = EditRecipeLogSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { id, note } = parsed.data

  const { data, error } = await auth.supabase
    .from("recipe_logs")
    .update({ note })
    .eq("id", id)
    .select("recipe_id")
    .maybeSingle()

  if (error) {
    return { message: error.message }
  }

  if (!data) {
    return { message: "Registro não encontrado ou sem permissão." }
  }

  revalidatePath(`/r/${data.recipe_id}`)

  return { data: { id } }
}

export async function deleteRecipeLogAction(
  logId: string
): Promise<FormState<{ id: string }>> {
  const auth = await requireUser()
  if (!auth.ok) return { message: auth.message }

  const { data, error } = await auth.supabase
    .from("recipe_logs")
    .delete()
    .eq("id", logId)
    .select("recipe_id")
    .maybeSingle()

  if (error) {
    return { message: error.message }
  }

  if (!data) {
    return { message: "Registro não encontrado ou sem permissão." }
  }

  revalidatePath(`/r/${data.recipe_id}`)

  return { data: { id: logId } }
}
