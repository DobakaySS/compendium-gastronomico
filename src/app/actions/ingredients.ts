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

export async function createIngredient(
  _prev: FormState,
  formData: FormData
): Promise<FormState<{ id: string }>> {
  const auth = await requireRole(["admin", "colaborador"])
  if (!auth.ok) return { message: auth.message }

  const parsed = IngredientSchema.safeParse(Object.fromEntries(formData))
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