"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export type SidebarSection = {
  label: string
  items: Array<{ href: string; label: string }>
}

export function SidebarNav({
  sections,
  onNavigate,
}: {
  sections: SidebarSection[]
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  const allItems = sections.flatMap((section) => section.items)
  const matches = allItems.filter(
    (item) =>
      pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(`${item.href}/`))
  )
  const activeHref =
    matches.length > 0
      ? matches.reduce((a, b) => (b.href.length > a.href.length ? b : a)).href
      : null

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
      {sections.map((section) => (
        <div key={section.label}>
          <p className="mb-2 px-3 text-[0.65rem] tracking-[0.3em] uppercase text-zinc-500">
            {section.label}
          </p>
          <ul className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                    item.href === activeHref
                      ? "bg-zinc-800/80 text-zinc-100"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}
