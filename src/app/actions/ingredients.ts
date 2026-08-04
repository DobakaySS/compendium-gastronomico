"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireRole } from "@/lib/crud"
import { IngredientSchema } from "@/lib/schema"

export type FormState<T = unknown> =
  | {
      errors?: Record<string, string[] | undefined>
      message?: string
      data?: T
    }
  | null

const MACRO_KEYS: readonly string[] = [
  "kcal_per_100g",
  "protein_per_100g",
  "carbs_per_100g",
  "fat_per_100g",
]

// FormData sempre entrega strings. Coerce os macros para number|null.
function normalizeIngredientFormData(formData: FormData) {
  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (MACRO_KEYS.includes(key)) {
      const s = String(value).trim()
      raw[key] = s === "" ? null : Number(s)
    } else {
      raw[key] = String(value)
    }
  }
  return raw
}

export async function createIngredient(
  _prev: FormState,
  formData: FormData
): Promise<FormState<{ id: string }>> {
  const auth = await requireRole(["admin", "colaborador"])
  if (!auth.ok) return { message: auth.message }

  const parsed = IngredientSchema.safeParse(normalizeIngredientFormData(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { name, default_unit, ...macros } = parsed.data

  const { error } = await auth.supabase
    .from("ingredients")
    .insert({
      name,
      default_unit,
      kcal_per_100g: macros.kcal_per_100g,
      protein_per_100g: macros.protein_per_100g,
      carbs_per_100g: macros.carbs_per_100g,
      fat_per_100g: macros.fat_per_100g,
    })
    .select("id")
    .single()

  if (error) {
    return { message: error.message }
  }

  revalidatePath("/")
  redirect("/dashboard")
}

export async function createIngredientQuick(
  _prev: FormState,
  formData: FormData
): Promise<FormState<{ id: string }>> {
  const auth = await requireRole(["admin", "colaborador"])
  if (!auth.ok) return { message: auth.message }

  const parsed = IngredientSchema.safeParse(normalizeIngredientFormData(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { name, default_unit, ...macros } = parsed.data

  const { data, error } = await auth.supabase
    .from("ingredients")
    .insert({
      name,
      default_unit,
      kcal_per_100g: macros.kcal_per_100g,
      protein_per_100g: macros.protein_per_100g,
      carbs_per_100g: macros.carbs_per_100g,
      fat_per_100g: macros.fat_per_100g,
    })
    .select("id")
    .single()

  if (error) {
    return { message: error.message }
  }

  revalidatePath("/recipes/new")
  return { data: { id: data.id } }
}