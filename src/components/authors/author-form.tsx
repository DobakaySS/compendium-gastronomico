"use client"

import { useActionState, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { AuthorSchema, type AuthorFormValues } from "@/lib/schema"
import { createAuthor, type FormState } from "@/app/actions/authors"
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
import { Field, FieldLabel, FieldContent, FieldError } from "@/components/ui/field"

export function AuthorForm() {
  const [state, formAction, pending] = useActionState<
    FormState<{ id: string }>,
    FormData
  >(createAuthor, null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthorFormValues>({
    resolver: zodResolver(AuthorSchema),
    defaultValues: { name: "" },
  })

  const onSubmit = useCallback(
    (values: AuthorFormValues) => {
      const fd = new FormData()
      fd.set("name", values.name)
      formAction(fd)
    },
    [formAction]
  )

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Novo autor</CardTitle>
        <CardDescription>
          Registre um autor (ex.: seu nome, um amigo ou um chef) para
          atribuir a receitas.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="flex flex-col gap-4">
          <Field orientation="vertical">
            <FieldLabel htmlFor="name">Nome</FieldLabel>
            <FieldContent>
              <Input
                id="name"
                placeholder="ex.: Chefe Ana"
                {...register("name")}
              />
              <FieldError errors={[{ message: errors.name?.message }]} />
            </FieldContent>
          </Field>
          {state?.message && (
            <p className="text-sm text-destructive">{state.message}</p>
          )}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Salvando..." : "Cadastrar autor"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}