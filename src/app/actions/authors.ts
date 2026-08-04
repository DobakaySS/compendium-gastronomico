"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireUser } from "@/lib/crud"
import { AuthorSchema } from "@/lib/schema"

export type FormState<T = unknown> =
  | {
      errors?: Record<string, string[] | undefined>
      message?: string
      data?: T
    }
  | null

export async function createAuthor(
  _prev: FormState,
  formData: FormData
): Promise<FormState<{ id: string }>> {
  const auth = await requireUser()
  if (!auth.ok) return { message: auth.message }

  const parsed = AuthorSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const { error } = await auth.supabase
    .from("authors")
    .insert({ name: parsed.data.name, user_id: auth.userId })
    .select("id")
    .single()

  if (error) {
    return { message: error.message }
  }

  revalidatePath("/")
  redirect("/dashboard")
}