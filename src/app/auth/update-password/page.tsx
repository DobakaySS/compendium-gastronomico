import { createClient } from "@/lib/supabase/server"
import { UpdatePasswordForm } from "@/components/auth/update-password-form"
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export default async function UpdatePasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const hasRecoverySession = user !== null

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      {hasRecoverySession ? <UpdatePasswordForm /> : <ForgotPasswordForm />}
    </main>
  )
}