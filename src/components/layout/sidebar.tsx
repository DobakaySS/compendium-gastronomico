"use client"

import Link from "next/link"
import { Dialog } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"
import { useSidebar } from "@/components/layout/sidebar-context"
import { SidebarNav, type SidebarSection } from "@/components/layout/sidebar-nav"
import { LogoutButton } from "@/components/auth/logout-button"
import { LoginLink } from "@/components/auth/login-link"

function SidebarLogo() {
  return (
    <Link href="/" className="group flex items-center gap-3 px-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-800/70 text-sm font-medium text-zinc-100 ring-1 ring-zinc-700">
        <span aria-hidden>CG</span>
      </span>
      <span>
        <span className="block font-heading text-sm tracking-[0.25em] uppercase text-zinc-100">
          Compendium
        </span>
        <span className="block text-[0.65rem] tracking-[0.35em] uppercase text-zinc-500">
          Gastronômico
        </span>
      </span>
    </Link>
  )
}

export function Sidebar({
  sections,
  isLoggedIn,
}: {
  sections: SidebarSection[]
  isLoggedIn: boolean
}) {
  const { open, setOpen } = useSidebar()

  if (sections.length === 0) return null

  const footer = (
    <div className="mt-auto flex flex-col gap-2 border-t border-zinc-800/70 pt-4">
      {isLoggedIn ? <LogoutButton /> : <LoginLink />}
    </div>
  )

  return (
    <>
      {/* Desktop — painel fixo */}
      <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 flex-col overflow-y-auto border-r border-zinc-800/70 px-2 py-6 lg:flex">
        <SidebarLogo />
        <div className="mt-6 flex flex-1 flex-col">
          <SidebarNav sections={sections} />
        </div>
        {footer}
      </aside>

      {/* Mobile — gaveta */}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 lg:hidden" />
          <Dialog.Popup
            aria-label="Menu de navegação"
            className="fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-72 flex-col overflow-y-auto bg-zinc-950 px-4 py-6 ring-1 ring-zinc-800 duration-300 outline-none data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-left data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-left lg:hidden"
          >
            <div className="mb-6 flex items-center justify-between">
              <SidebarLogo />
              <Dialog.Close
                render={
                  <button
                    type="button"
                    aria-label="Fechar menu"
                    className="grid size-9 place-items-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
                  />
                }
              >
                <XIcon className="size-5" />
              </Dialog.Close>
            </div>
            <div className="flex flex-1 flex-col">
              <SidebarNav sections={sections} onNavigate={() => setOpen(false)} />
            </div>
            {footer}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
