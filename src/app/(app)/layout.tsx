import { createClient } from "@/lib/supabase/server"
import { canAdmin, canWrite, userRole } from "@/lib/roles"
import { AppHeader } from "@/components/layout/app-header"
import { Sidebar } from "@/components/layout/sidebar"
import { SidebarProvider } from "@/components/layout/sidebar-context"
import type { SidebarSection } from "@/components/layout/sidebar-nav"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = userRole(user)
  const writer = canWrite(role)
  const admin = canAdmin(role)

  const sections: SidebarSection[] = []
  if (writer) {
    sections.push({
      label: "Estúdio",
      items: [{ href: "/dashboard", label: "Dashboard" }],
    })
    sections.push({
      label: "Receitas",
      items: [{ href: "/recipes/new", label: "Nova receita" }],
    })
    sections.push({
      label: "Ingredientes",
      items: [
        { href: "/ingredients", label: "Catálogo" },
        { href: "/ingredients/new", label: "Novo ingrediente" },
      ],
    })
    sections.push({
      label: "Autores",
      items: [{ href: "/authors/new", label: "Cadastrar autor" }],
    })
  }
  if (admin) {
    sections.push({
      label: "Administração",
      items: [{ href: "/admin/users", label: "Usuários" }],
    })
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-dvh flex-col">
        <AppHeader showMenu={sections.length > 0} />
        <div className="flex flex-1">
          <Sidebar sections={sections} isLoggedIn={Boolean(user)} />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </SidebarProvider>
  )
}
