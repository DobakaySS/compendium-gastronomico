"use client"

import { useActionState } from "react"
import { updatePassword } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field"

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState<
    { errors?: { password?: string[] }; message?: string } | null,
    FormData
  >(updatePassword, null)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field orientation="vertical">
        <FieldLabel htmlFor="password">Nova senha</FieldLabel>
        <FieldContent>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="No mínimo 6 caracteres"
            required
          />
          <FieldError
            errors={state?.errors?.password?.map((m) => ({ message: m }))}
          />
        </FieldContent>
      </Field>
      {state?.message && <p className="text-sm text-zinc-400">{state.message}</p>}
      <Button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-full"
      >
        {pending ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  )
}