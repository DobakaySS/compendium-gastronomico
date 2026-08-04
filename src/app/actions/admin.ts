"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/crud"

export type AdminState = {
  errors?: { email?: string[]; password?: string[] }
  message?: string
} | null

const emailSchema = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export async function createAccount(
  _prev: AdminState,
  formData: FormData
): Promise<AdminState> {
  const auth = await requireRole(["admin"])
  if (!auth.ok) return { message: "Sem permissão para criar contas." }

  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")

  const errors: AdminState = { errors: {} }
  if (!email || !emailSchema(email)) {
    errors.errors!.email = ["Informe um e-mail válido."]
  }
  if (!password || password.length < 6) {
    errors.errors!.password = ["A senha deve ter ao menos 6 caracteres."]
  }
  if (errors.errors!.email || errors.errors!.password) return errors

  const { error } = await auth.supabase.rpc("admin_create_user", {
    p_email: email,
    p_password: password,
  })

  if (error) {
    if (error.message.includes("not_authorized")) {
      return { message: "Sem permissão para criar contas." }
    }
    if (error.message.toLowerCase().includes("duplicat")) {
      return { message: "Já existe uma conta com esse e-mail." }
    }
    return { message: "Não foi possível criar a conta." }
  }

  revalidatePath("/admin/users")
  return { message: "Conta criada com sucesso." }
}