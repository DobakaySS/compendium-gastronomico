"use client"

import { useActionState } from "react"
import Link from "next/link"
import { signup, type AuthState } from "@/app/actions/auth"
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

export function SignupForm() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signup,
    null
  )

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>
          Cadastre-se para gerenciar suas receitas.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
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
          {state?.message && (
            <p className="text-sm text-muted-foreground">{state.message}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Criando..." : "Criar conta"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/login" className="underline">
              Entrar
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}