"use client"

import { useActionState } from "react"
import Link from "next/link"
import { signup, type AuthState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field"

export function SignupForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signup,
    null
  )

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
      {state?.message && <p className="text-sm text-zinc-400">{state.message}</p>}
      <Button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-full"
      >
        {pending ? "Criando..." : "Criar conta"}
      </Button>
      <p className="text-center text-sm text-zinc-500">
        Já tem conta?{" "}
        <Link href="/login" className="underline">
          Entrar
        </Link>
      </p>
    </form>
  )
}