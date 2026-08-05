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

const NUMERIC_KEYS: readonly string[] = [
  "kcal_per_100g",
  "protein_per_100g",
  "carbs_per_100g",
  "fat_per_100g",
  "grams_per_unit",
]

// FormData sempre entrega strings. Coerce os macros e grams_per_unit para number|null.
function normalizeIngredientFormData(formData: FormData) {
  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (NUMERIC_KEYS.includes(key)) {
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

  const { name, default_unit, ...rest } = parsed.data

  const { error } = await auth.supabase
    .from("ingredients")
    .insert({
      name,
      default_unit,
      grams_per_unit: rest.grams_per_unit,
      kcal_per_100g: rest.kcal_per_100g,
      protein_per_100g: rest.protein_per_100g,
      carbs_per_100g: rest.carbs_per_100g,
      fat_per_100g: rest.fat_per_100g,
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

  const { name, default_unit, ...rest } = parsed.data

  const { data, error } = await auth.supabase
    .from("ingredients")
    .insert({
      name,
      default_unit,
      grams_per_unit: rest.grams_per_unit,
      kcal_per_100g: rest.kcal_per_100g,
      protein_per_100g: rest.protein_per_100g,
      carbs_per_100g: rest.carbs_per_100g,
      fat_per_100g: rest.fat_per_100g,
    })
    .select("id")
    .single()

  if (error) {
    return { message: error.message }
  }

  revalidatePath("/recipes/new")
  return { data: { id: data.id } }
}

export async function updateIngredient(
  _prev: FormState,
  formData: FormData
): Promise<FormState<{ id: string }>> {
  const auth = await requireRole(["admin", "colaborador"])
  if (!auth.ok) return { message: auth.message }

  const id = String(formData.get("id") ?? "")
  if (!id) {
    return { message: "Ingrediente inválido." }
  }

  const parsed = IngredientSchema.safeParse(normalizeIngredientFormData(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { name, default_unit, ...rest } = parsed.data

  const { error } = await auth.supabase
    .from("ingredients")
    .update({
      name,
      default_unit,
      grams_per_unit: rest.grams_per_unit,
      kcal_per_100g: rest.kcal_per_100g,
      protein_per_100g: rest.protein_per_100g,
      carbs_per_100g: rest.carbs_per_100g,
      fat_per_100g: rest.fat_per_100g,
    })
    .eq("id", id)

  if (error) {
    return { message: error.message }
  }

  revalidatePath("/", "layout")
  redirect("/ingredients")
}