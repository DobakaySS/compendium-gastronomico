"use client"

import { useActionState } from "react"
import { createAccount, type AdminState } from "@/app/actions/admin"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field"

export function CreateUserForm() {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    createAccount,
    null
  )

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5"
    >
      <h2 className="font-heading text-lg text-zinc-100">Criar colaborador</h2>
      <p className="mt-1 text-sm text-zinc-500">
        A conta criada terá acesso total, menos a criação de outras contas.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <Field orientation="vertical">
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <FieldContent>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="off"
              placeholder="colaborador@exemplo.com"
              required
            />
            <FieldError
              errors={state?.errors?.email?.map((m) => ({ message: m }))}
            />
          </FieldContent>
        </Field>
        <Field orientation="vertical">
          <FieldLabel htmlFor="password">Senha</FieldLabel>
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
      </div>

      {state?.message && (
        <p
          className={
            state.message === "Conta criada com sucesso."
              ? "mt-4 text-sm text-emerald-400"
              : "mt-4 text-sm text-zinc-400"
          }
        >
          {state.message}
        </p>
      )}

      <Button type="submit" disabled={pending} className="mt-5 w-full rounded-full">
        {pending ? "Criando..." : "Criar conta"}
      </Button>
    </form>
  )
}