import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"
import { AuthShell } from "@/components/auth/auth-shell"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return (
    <AuthShell title="Entrar" subtitle="Acesse sua coleção gastronômica.">
      <Suspense>
        <LoginForm next={next} />
      </Suspense>
    </AuthShell>
  )
}