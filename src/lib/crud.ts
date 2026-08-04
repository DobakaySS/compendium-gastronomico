import "server-only"
import { createClient } from "@/lib/supabase/server"

export type AuthResult =
  | { ok: true; supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
  | { ok: false; message: string }

export async function requireUser(): Promise<AuthResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, message: "Você precisa estar autenticado." }
  }

  return { ok: true, supabase, userId: user.id }
}