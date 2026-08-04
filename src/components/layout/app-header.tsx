import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { canWrite, canAdmin, userRole } from "@/lib/roles"
import { LogoutButton } from "@/components/auth/logout-button"
import { LoginLink } from "@/components/auth/login-link"
import { CitySelector } from "@/components/layout/city-selector"

export async function AppHeader() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = userRole(user)

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/70 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="group flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-zinc-800/70 text-sm font-medium text-zinc-100 ring-1 ring-zinc-700">
            <span aria-hidden>CG</span>
          </span>
          <span className="hidden sm:block">
            <span className="block font-heading text-sm tracking-[0.25em] uppercase text-zinc-100">
              Compendium
            </span>
            <span className="block text-[0.65rem] tracking-[0.35em] uppercase text-zinc-500">
              Gastronômico
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <CitySelector />

          <Link
            href="/"
            className="rounded-full px-3 py-1.5 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-300 transition-colors hover:text-zinc-100"
          >
            Receitas
          </Link>

          {user && canWrite(role) && (
            <Link
              href="/recipes/new"
              className="rounded-full px-3 py-1.5 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-300 transition-colors hover:text-zinc-100"
            >
              Nova
            </Link>
          )}

          {user && canAdmin(role) && (
            <Link
              href="/admin/users"
              className="rounded-full px-3 py-1.5 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-300 transition-colors hover:text-zinc-100"
            >
              Usuários
            </Link>
          )}

          {user ? <LogoutButton /> : <LoginLink />}
        </nav>
      </div>
    </header>
  )
}