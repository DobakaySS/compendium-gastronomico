"use client"

import { useActionState } from "react"
import { resetPassword } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field"

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<
    { errors?: { email?: string[] }; message?: string } | null,
    FormData
  >(resetPassword, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field orientation="vertical">
        <FieldLabel htmlFor="email">E-mail</FieldLabel>
        <FieldContent>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            required
          />
          <FieldError
            errors={state?.errors?.email?.map((m) => ({ message: m }))}
          />
        </FieldContent>
      </Field>
      {state?.message && <p className="text-sm text-zinc-400">{state.message}</p>}
      <Button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-full"
      >
        {pending ? "Enviando..." : "Enviar link de recuperação"}
      </Button>
    </form>
  )
}