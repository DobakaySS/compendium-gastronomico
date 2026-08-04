"use client"

import { useActionState } from "react"
import Link from "next/link"
import { login, loginAsVisitor, type AuthState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field"

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    login,
    null
  )

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? "/"} />
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
          <FieldError errors={state?.errors?.email?.map((m) => ({ message: m }))} />
        </FieldContent>
      </Field>
      <Field orientation="vertical">
        <FieldLabel htmlFor="password">Senha</FieldLabel>
        <FieldContent>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
          <FieldError
            errors={state?.errors?.password?.map((m) => ({ message: m }))}
          />
        </FieldContent>
      </Field>
      {state?.message && (
        <p className="text-sm text-zinc-400">{state.message}</p>
      )}
      <Button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-full"
      >
        {pending ? "Entrando..." : "Entrar"}
      </Button>
      <div className="flex items-center gap-3 py-1">
        <span className="h-px flex-1 bg-zinc-800" />
        <span className="text-[0.65rem] tracking-[0.25em] uppercase text-zinc-500">
          ou
        </span>
        <span className="h-px flex-1 bg-zinc-800" />
      </div>
      <form action={loginAsVisitor}>
        <Button
          type="submit"
          variant="outline"
          className="w-full rounded-full"
        >
          Entrar como visitante
        </Button>
      </form>
      <p className="text-center text-sm text-zinc-500">
        Esqueceu sua senha?{" "}
        <Link href="/auth/update-password" className="underline">
          Redefinir
        </Link>
      </p>
    </form>
  )
}