"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"

export type AuthState = {
  errors?: {
    email?: string[]
    password?: string[]
  }
  message?: string
} | null

const emailSchema = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

function validateCredentials(formData: FormData): AuthState {
  const email = String(formData.get("email") ?? "")
  const password = String(formData.get("password") ?? "")
  const errors: AuthState = { errors: {} }

  if (!email || !emailSchema(email)) {
    errors.errors!.email = ["Informe um e-mail válido."]
  }
  if (!password || password.length < 6) {
    errors.errors!.password = ["A senha deve ter ao menos 6 caracteres."]
  }

  return errors.errors!.email || errors.errors!.password ? errors : null
}

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const validation = validateCredentials(formData)
  if (validation) return validation

  const email = String(formData.get("email"))
  const password = String(formData.get("password"))

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { message: "E-mail ou senha incorretos." }
  }

  const next = String(formData.get("next") ?? "/")
  revalidatePath("/", "layout")
  redirect(next.startsWith("/") ? next : "/")
}

export async function signup(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const validation = validateCredentials(formData)
  if (validation) return validation

  const email = String(formData.get("email"))
  const password = String(formData.get("password"))

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

  if (error) {
    return { message: "Não foi possível criar a conta. Tente novamente." }
  }

  // Quando a confirmação de e-mail está habilitada, o usuário precisa
  // clicar no link enviado antes de poder entrar.
  if (!data.session) {
    return {
      message:
        "Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.",
    }
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}

export async function loginAsVisitor(): Promise<never> {
  const supabase = await createClient()

  const auth = supabase.auth as unknown as {
    signInAnon: () => Promise<{ error: Error | null }>
  }
  const { error } = await auth.signInAnon()

  if (error) {
    redirect("/login")
  }

  revalidatePath("/", "layout")
  redirect("/")
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath("/", "layout")
  redirect("/login")
}

export async function resetPassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")

  if (!email || !emailSchema(email)) {
    return { errors: { email: ["Informe um e-mail válido."] } }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/update-password`,
  })

  if (error) {
    return { message: "Não foi possível enviar o e-mail de recuperação." }
  }

  return {
    message:
      "Se o e-mail existir, enviaremos um link para redefinir sua senha.",
  }
}

export async function updatePassword(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "")

  if (!password || password.length < 6) {
    return { errors: { password: ["A nova senha deve ter ao menos 6 caracteres."] } }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { message: "Não foi possível atualizar a senha." }
  }

  revalidatePath("/", "layout")
  redirect("/dashboard")
}