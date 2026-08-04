import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { AppHeader } from "@/components/layout/app-header"

const actions = [
  {
    href: "/recipes/new",
    label: "Nova receita",
    description: "Crie uma receita com passos, ingredientes e autores.",
  },
  {
    href: "/ingredients/new",
    label: "Novo ingrediente",
    description: "Adicione um alimento ao catálogo com macros por 100g.",
  },
  {
    href: "/ingredients",
    label: "Catálogo de ingredientes",
    description: "Consulte e edite os alimentos e macros por 100g.",
  },
  {
    href: "/authors/new",
    label: "Novo autor",
    description: "Cadastre um autor para as receitas do compêndium.",
  },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const name =
    user.user_metadata?.name ?? user.email?.split("@")[0] ?? "cozinheiro(a)"

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <span className="text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
          Estúdio
        </span>
        <h1 className="mt-2 font-heading text-3xl text-zinc-50">
          Olá, {name}.
        </h1>
        <p className="mt-2 max-w-md text-sm text-zinc-400">
          A partir daqui você dá forma ao compêndium — receitas, ingredientes e
          autores.
        </p>

        <div className="mt-10 grid gap-3">
          {actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="group flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-5 py-5 transition-colors hover:border-zinc-600 hover:bg-zinc-900"
            >
              <div>
                <p className="font-heading text-lg text-zinc-100">
                  {a.label}
                </p>
                <p className="mt-0.5 text-sm text-zinc-500">{a.description}</p>
              </div>
              <span className="text-zinc-600 transition-colors group-hover:text-zinc-300">
                →
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}