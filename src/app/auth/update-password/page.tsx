import { createClient } from "@/lib/supabase/server"
import { UpdatePasswordForm } from "@/components/auth/update-password-form"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"
import { AuthShell } from "@/components/auth/auth-shell"

export default async function UpdatePasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const hasRecoverySession = user !== null

  return hasRecoverySession ? (
    <AuthShell
      title="Definir nova senha"
      subtitle="Informe sua nova senha para continuar."
    >
      <UpdatePasswordForm />
    </AuthShell>
  ) : (
    <AuthShell
      title="Recuperar senha"
      subtitle="Enviaremos um link para você redefinir sua senha."
    >
      <ForgotPasswordForm />
    </AuthShell>
  )
}