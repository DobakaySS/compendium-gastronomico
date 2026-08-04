"use client"

import { useActionState } from "react"
import { updatePassword } from "@/app/actions/auth"
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

export function UpdatePasswordForm() {
  const [state, formAction, pending] = useActionState<
    { errors?: { password?: string[] }; message?: string } | null,
    FormData
  >(updatePassword, null)

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Definir nova senha</CardTitle>
        <CardDescription>
          Informe sua nova senha para continuar.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-4">
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
          {state?.message && (
            <p className="text-sm text-muted-foreground">{state.message}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}