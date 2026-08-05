import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { canAdmin, userRole } from "@/lib/roles"
import { CreateUserForm } from "@/components/admin/create-user-form"

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  colaborador: "Colaborador",
  visitante: "Visitante",
}

type AdminUser = {
  id: string
  email: string | null
  role: string
  created_at: string
}

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !canAdmin(userRole(user))) {
    redirect("/")
  }

  const { data: users, error } = await supabase.rpc("admin_list_users")

  if (error) {
    throw new Error(error.message)
  }

  const list = (users ?? []) as AdminUser[]

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <span className="text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
          Administração
        </span>
        <h1 className="mt-2 font-heading text-3xl text-zinc-50">Usuários</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Gerencie as contas do compêndium.
        </p>

        <div className="mt-8">
          <CreateUserForm />
        </div>

        <div className="mt-8">
          <p className="mb-3 text-[0.7rem] tracking-[0.3em] uppercase text-zinc-500">
            Contas ({list.length})
          </p>
          <ul className="divide-y divide-zinc-800 rounded-2xl border border-zinc-800 bg-zinc-900/40">
            {list.map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-4 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-zinc-100">{u.email}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(u.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-zinc-700 px-3 py-1 text-[0.65rem] tracking-[0.15em] uppercase text-zinc-300">
                  {ROLE_LABELS[u.role] ?? u.role}
                </span>
              </li>
            ))}
          </ul>
        </div>
    </main>
  )
}