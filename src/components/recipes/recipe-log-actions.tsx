"use client"

import * as React from "react"
import { useTransition } from "react"
import { toast } from "sonner"
import { PencilIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
import {
  updateRecipeLogAction,
  deleteRecipeLogAction,
  type FormState,
} from "@/app/actions/recipe-logs"

type RecipeLogActionsProps = {
  logId: string
  initialNote: string
}

export function RecipeLogActions({ logId, initialNote }: RecipeLogActionsProps) {
  const [editOpen, setEditOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [errors, setErrors] = React.useState<
    Record<string, string[] | undefined> | null
  >(null)
  const [editPending, startEdit] = useTransition()
  const [deletePending, startDelete] = useTransition()

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setErrors(null)
    startEdit(async () => {
      const res: FormState<{ id: string }> = await updateRecipeLogAction(
        null,
        formData
      )
      if (res?.message) {
        toast.error(res.message)
        return
      }
      if (res?.errors) {
        setErrors(res.errors)
        return
      }
      toast.success("Nota atualizada.")
      setEditOpen(false)
    })
  }

  const handleDelete = () => {
    startDelete(async () => {
      const res = await deleteRecipeLogAction(logId)
      if (res?.message) {
        toast.error(res.message)
        return
      }
      toast.success("Nota excluída.")
      setDeleteOpen(false)
    })
  }

  return (
    <>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-zinc-500 hover:text-zinc-200"
          onClick={() => setEditOpen(true)}
          aria-label="Editar nota"
        >
          <PencilIcon className="size-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-zinc-500 hover:text-red-400"
          onClick={() => setDeleteOpen(true)}
          aria-label="Excluir nota"
        >
          <Trash2Icon className="size-3.5" />
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <form onSubmit={handleEditSubmit}>
            <input type="hidden" name="id" value={logId} />

            <DialogHeader>
              <DialogTitle>Editar nota</DialogTitle>
              <DialogDescription>
                Atualize o texto do registro do caderno.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              <Field>
                <FieldLabel>Nota *</FieldLabel>
                <FieldContent>
                  <Textarea
                    name="note"
                    rows={5}
                    defaultValue={initialNote}
                    placeholder="Escreva a nota..."
                  />
                  {errors?.note?.[0] && (
                    <FieldError>{errors.note[0]}</FieldError>
                  )}
                </FieldContent>
              </Field>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={editPending}>
                {editPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Excluir nota?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={deletePending}
            >
              {deletePending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
