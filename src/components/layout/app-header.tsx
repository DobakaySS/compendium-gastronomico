import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { canWrite, userRole } from "@/lib/roles"
import { LogoutButton } from "@/components/auth/logout-button"
import { LoginLink } from "@/components/auth/login-link"
import { CitySelector } from "@/components/layout/city-selector"
import { MenuButton } from "@/components/layout/menu-button"

export async function AppHeader({ showMenu = false }: { showMenu?: boolean }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = userRole(user)

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/70 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-1.5">
          {showMenu && <MenuButton />}
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
        </div>

        <nav className="flex items-center gap-1 sm:gap-2">
          <CitySelector />

          <Link
            href="/"
            className="hidden rounded-full px-3 py-1.5 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-300 transition-colors hover:text-zinc-100 md:inline-flex"
          >
            Receitas
          </Link>

          {user && (
            <Link
              href="/shopping"
              className="rounded-full px-3 py-1.5 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-300 transition-colors hover:text-zinc-100 md:inline-flex"
            >
              Compras
            </Link>
          )}

          {user && canWrite(role) && (
            <Link
              href="/recipes/smart-import"
              className="hidden rounded-full px-3 py-1.5 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-300 transition-colors hover:text-zinc-100 md:inline-flex"
            >
              Smart Import
            </Link>
          )}

          {user ? <LogoutButton /> : <LoginLink />}
        </nav>
      </div>
    </header>
  )
}
