"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireRole } from "@/lib/crud"
import { DEFAULT_TAG_COLOR } from "@/lib/tags"

export type FormState<T = unknown> =
  | {
      errors?: Record<string, string[] | undefined>
      message?: string
      data?: T
    }
  | null

const TagSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da tag.")
    .max(40, "Nome muito longo."),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida."),
})

// Cria uma tag no catálogo compartilhado e devolve o id (uso inline).
export async function createTagQuick(
  _prev: FormState,
  formData: FormData
): Promise<FormState<{ id: string }>> {
  const auth = await requireRole(["admin", "colaborador"])
  if (!auth.ok) return { message: auth.message }

  const parsed = TagSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    color: String(formData.get("color") ?? DEFAULT_TAG_COLOR),
  })
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { data, error } = await auth.supabase
    .from("tags")
    .insert({ name: parsed.data.name, color: parsed.data.color })
    .select("id")
    .single()

  if (error) {
    return { message: error.message }
  }

  revalidatePath("/", "layout")
  return { data: { id: data.id } }
}
