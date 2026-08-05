"use client"

import * as React from "react"
import { useActionState } from "react"
import { createClient } from "@/lib/supabase/client"
import { createTagQuick, type FormState } from "@/app/actions/tags"
import type { Tag } from "@/lib/schema"
import { TAG_COLORS } from "@/lib/tags"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldError } from "@/components/ui/field"
import { TagBadge } from "@/components/tags/tag-badge"
import { PlusIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type TagPickerProps = {
  values: string[]
  onValueChange: (values: string[]) => void
  loading?: boolean
}

export function TagPicker({ values, onValueChange, loading }: TagPickerProps) {
  const [tags, setTags] = React.useState<Tag[]>([])
  const [ready, setReady] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [newColor, setNewColor] = React.useState<string>(TAG_COLORS[0])

  const [state, formAction, pending] = useActionState<
    FormState<{ id: string }>,
    FormData
  >(createTagQuick, null)

  const lastCreatedRef = React.useRef<string | null>(null)

  const loadTags = React.useCallback(() => {
    const supabase = createClient()
    return supabase
      .from("tags")
      .select("id, name, color")
      .order("name")
      .then(({ data, error }) => {
        if (!error && data) setTags(data as Tag[])
        setReady(true)
      })
  }, [])

  React.useEffect(() => {
    loadTags()
  }, [loadTags])

  const toggle = (id: string) => {
    const next = values.includes(id)
      ? values.filter((v) => v !== id)
      : [...values, id]
    onValueChange(next)
  }

  // Depois que a tag é criada, adiciona ao estado local e a seleciona.
  React.useEffect(() => {
    const id = state?.data?.id
    if (!id || lastCreatedRef.current === id) return
    lastCreatedRef.current = id
    loadTags()
    onValueChange([...values, id])
    setCreating(false)
    setNewName("")
  }, [state, loadTags, onValueChange, values])

  const selected = tags.filter((t) => values.includes(t.id))

  return (
    <div className="flex w-full flex-col gap-2">
      {loading || (!ready && tags.length === 0) ? (
        <p className="text-xs text-zinc-500">Carregando tags...</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => {
            const active = values.includes(tag.id)
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggle(tag.id)}
                aria-pressed={active}
                className="group rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
              >
                <TagBadge
                  tag={tag}
                  className={cn(
                    "cursor-pointer transition-opacity",
                    !active && "opacity-45 hover:opacity-80"
                  )}
                />
                <span
                  className={cn(
                    "sr-only",
                    active && "not-sr-only inline-flex"
                  )}
                />
              </button>
            )
          })}
        </div>
      )}

      {creating ? (
        <form
          action={formAction}
          className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3"
        >
          <div className="flex gap-2">
            <input type="hidden" name="color" value={newColor} />
            <Input
              name="name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nome da nova tag"
              className="h-8 flex-1"
              autoFocus
            />
            <Button
              type="submit"
              size="sm"
              disabled={pending || !newName.trim()}
            >
              {pending ? "Criando..." : "Criar"}
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Cancelar"
              onClick={() => setCreating(false)}
            >
              <XIcon />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {TAG_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Cor ${color}`}
                onClick={() => setNewColor(color)}
                className={cn(
                  "size-5 rounded-full transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400",
                  newColor === color
                    ? "scale-110 ring-2 ring-zinc-100 ring-offset-2 ring-offset-zinc-900"
                    : "hover:scale-105"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
            <span
              className="ml-1 rounded-full px-2.5 py-0.5 text-[0.65rem] font-medium"
              style={{
                backgroundColor: `${newColor}1f`,
                color: newColor,
                borderColor: `${newColor}4d`,
                borderWidth: 1,
              }}
            >
              {newName.trim() || "ex.: Sem glúten"}
            </span>
          </div>

          <FieldError
            errors={[
              { message: state?.errors?.name?.[0] },
              { message: state?.message },
            ]}
          />
        </form>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => setCreating(true)}
        >
          <PlusIcon /> Nova tag
        </Button>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <span key={tag.id} className="inline-flex items-center gap-1">
              <TagBadge tag={tag} />
              <button
                type="button"
                aria-label={`Remover ${tag.name}`}
                onClick={() => toggle(tag.id)}
                className="rounded-full text-zinc-500 hover:text-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
