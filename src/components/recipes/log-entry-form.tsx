"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { PencilIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldLabel,
  FieldContent,
  FieldError,
} from "@/components/ui/field"
import type { FormState } from "@/app/actions/recipe-logs"

export type AuthorOption = {
  id: string
  name: string
}

type LogEntryFormProps = {
  recipeId: string
  authors: AuthorOption[]
  action: (
    prev: FormState,
    formData: FormData
  ) => Promise<FormState<{ id: string }>>
}

export function LogEntryForm({ recipeId, authors, action }: LogEntryFormProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    null
  )

  useEffect(() => {
    if (state?.data) {
      toast.success("Nota registrada.")
      formRef.current?.reset()
    }
  }, [state])

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-6 h-8 rounded-full px-3 text-[0.65rem] tracking-[0.15em] uppercase"
        onClick={() => setOpen(true)}
      >
        <PencilIcon className="size-3.5" />
        Registrar nota do chef
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <form ref={formRef} action={formAction}>
            <input type="hidden" name="recipe_id" value={recipeId} />

            <DialogHeader>
              <DialogTitle>Nova nota de experimento</DialogTitle>
              <DialogDescription>
                Registre observações, variações e aprendizados desta receita.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 flex flex-col gap-4">
              <Field>
                <FieldLabel>Autor *</FieldLabel>
                <FieldContent>
                  <Select
                    name="author_id"
                    items={authors.map((author) => ({
                      value: author.id,
                      label: author.name,
                    }))}
                    defaultValue={authors[0]?.id ?? ""}
                    disabled={authors.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {authors.map((author) => (
                        <SelectItem key={author.id} value={author.id}>
                          {author.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {state?.errors?.author_id?.[0] && (
                    <FieldError>{state.errors.author_id[0]}</FieldError>
                  )}
                </FieldContent>
              </Field>

              <Field>
                <FieldLabel>Nota *</FieldLabel>
                <FieldContent>
                  <Textarea
                    name="note"
                    rows={5}
                    placeholder="Reduzi o pecorino em 10g e adicionei água da massa antes de finalizar..."
                  />
                  {state?.errors?.note?.[0] && (
                    <FieldError>{state.errors.note[0]}</FieldError>
                  )}
                </FieldContent>
              </Field>

              {state?.message && (
                <p className="text-xs text-red-400">{state.message}</p>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={pending || authors.length === 0}>
                {pending ? "Registrando..." : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
