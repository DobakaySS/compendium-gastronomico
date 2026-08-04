import { Suspense } from "react"
import { SignupForm } from "@/components/auth/signup-form"
import { AuthShell } from "@/components/auth/auth-shell"

export default async function SignupPage() {
  return (
    <AuthShell title="Criar conta" subtitle="Comece seu compêndium gastronômico.">
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthShell>
  )
}