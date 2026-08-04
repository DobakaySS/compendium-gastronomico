"use client"

import { useActionState } from "react"
import { resetPassword } from "@/app/actions/auth"
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

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<
    { errors?: { email?: string[] }; message?: string } | null,
    FormData
  >(resetPassword, null)

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Recuperar senha</CardTitle>
        <CardDescription>
          Enviaremos um link para você redefinir sua senha.
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
          {state?.message && (
            <p className="text-sm text-muted-foreground">{state.message}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Enviando..." : "Enviar link de recuperação"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}