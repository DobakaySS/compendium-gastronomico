export type Role = "admin" | "colaborador" | "visitante"

export const WRITE_ROLES: Role[] = ["admin", "colaborador"]
export const ADMIN_ROLES: Role[] = ["admin"]

type UserLike = {
  id?: string
  email?: string | undefined
  app_metadata?: Record<string, unknown> | null
}

export function userRole(user: UserLike | null | undefined): Role {
  if (!user) return "visitante"
  // Visitantes são sessões anônimas do Supabase (is_anonymous) ou usuários
  // registrados sem papel de escrita atribuído.
  const role = user.app_metadata?.role as string | undefined
  if (role === "admin") return "admin"
  if (role === "colaborador") return "colaborador"
  if (role === "visitante") return "visitante"
  return "visitante"
}

export function canWrite(role: Role): boolean {
  return WRITE_ROLES.includes(role)
}

export function canAdmin(role: Role): boolean {
  return role === "admin"
}