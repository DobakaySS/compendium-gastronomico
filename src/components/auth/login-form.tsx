"use client"

import { useActionState } from "react"
import Link from "next/link"
import { login, type AuthState } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>
          Acesse sua conta no Compendium Gastronômico.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next ?? "/dashboard"} />
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
            <p className="text-sm text-muted-foreground">{state.message}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Entrando..." : "Entrar"}
          </Button>
          <div className="flex items-center justify-between text-sm">
            <Link href="/signup" className="text-muted-foreground underline">
              Criar conta
            </Link>
            <Link href="/auth/update-password" className="text-muted-foreground underline">
              Esqueci minha senha
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}