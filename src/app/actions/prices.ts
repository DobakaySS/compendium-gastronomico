"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/crud"
import { PriceLogSchema } from "@/lib/schema"

export type FormState<T = unknown> =
  | {
      errors?: Record<string, string[] | undefined>
      message?: string
      data?: T
    }
  | null

export async function logPrice(
  _prev: FormState,
  formData: FormData
): Promise<FormState<{ id: string }>> {
  const auth = await requireRole(["admin", "colaborador"])
  if (!auth.ok) return { message: auth.message }

  const raw: Record<string, unknown> = {}
  for (const [key, value] of formData.entries()) {
    if (["price", "reference_amount"].includes(key)) {
      const s = String(value).trim()
      raw[key] = s === "" ? null : Number(s)
    } else {
      raw[key] = String(value)
    }
  }

  const parsed = PriceLogSchema.safeParse(raw)
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { ingredient_id, city, price, reference_amount, reference_unit, recorded_on } =
    parsed.data

  const { error } = await auth.supabase.from("ingredient_prices").insert({
    ingredient_id,
    city,
    price,
    currency: "BRL",
    reference_amount,
    reference_unit,
    recorded_on,
  })

  if (error) {
    return { message: error.message }
  }

  revalidatePath(`/ingredients/${ingredient_id}`)

  return { data: { id: ingredient_id } }
}
