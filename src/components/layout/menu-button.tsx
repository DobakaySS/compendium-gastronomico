"use client"

import { MenuIcon } from "lucide-react"
import { useSidebar } from "@/components/layout/sidebar-context"

export function MenuButton() {
  const { setOpen } = useSidebar()

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Abrir menu"
      className="grid size-9 shrink-0 place-items-center rounded-full text-zinc-300 transition-colors hover:bg-zinc-800/70 hover:text-zinc-100 lg:hidden"
    >
      <MenuIcon className="size-5" />
    </button>
  )
}
