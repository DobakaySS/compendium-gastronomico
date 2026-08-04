import "server-only"
import { createClient } from "@/lib/supabase/server"
import { userRole, type Role } from "@/lib/roles"

export type AuthResult =
  | {
      ok: true
      supabase: Awaited<ReturnType<typeof createClient>>
      userId: string
      role: Role
    }
  | { ok: false; message: string }

export async function requireUser(): Promise<AuthResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, message: "Você precisa estar autenticado." }
  }

  return {
    ok: true,
    supabase,
    userId: user.id,
    role: userRole(user),
  }
}

export async function requireRole(roles: Role[]): Promise<AuthResult> {
  const auth = await requireUser()
  if (!auth.ok) return auth

  if (!roles.includes(auth.role)) {
    return { ok: false, message: "Você não tem permissão para essa ação." }
  }

  return auth
}