"use client"

import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type VersionOption = {
  id: string
  title: string
  version_name: string | null
}

export function VersionSwitcher({
  versions,
  currentId,
}: {
  versions: VersionOption[]
  currentId: string
}) {
  const router = useRouter()

  if (versions.length <= 1) return null

  const labelFor = (v: VersionOption) => v.version_name ?? v.title

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
        Versão em edição
      </span>
      <Select
        value={currentId}
        onValueChange={(id) => {
          if (id && id !== currentId) router.push(`/recipes/${id}/edit`)
        }}
        itemToStringLabel={(value) => {
          const found = versions.find((v) => v.id === value)
          return found ? labelFor(found) : String(value)
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="w-full">
          {versions.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              {labelFor(v)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
