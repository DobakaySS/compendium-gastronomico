import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { LogoutButton } from "@/components/auth/logout-button"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="flex w-full items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-muted-foreground">
            Bem-vindo(a), {user.email ?? "cozinheiro(a)"}!
          </p>
        </div>
        <LogoutButton />
      </div>

      <nav className="grid w-full gap-3">
        <Button
          size="lg"
          className="w-full justify-start"
          nativeButton={false}
          render={<Link href="/recipes/new" />}
        >
          Nova receita
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/ingredients/new" />}
          >
            Novo ingrediente
          </Button>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link href="/authors/new" />}
          >
            Novo autor
          </Button>
        </div>
      </nav>
    </main>
  )
}