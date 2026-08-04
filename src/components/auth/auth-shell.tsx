import Link from "next/link"
import type { ReactNode } from "react"

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,#33415540_0%,transparent_60%)]" />
      <div className="relative z-10 flex w-full max-w-sm flex-col">
        <Link href="/" className="mb-8 self-center text-center">
          <p className="font-heading text-2xl tracking-[0.2em] uppercase text-zinc-50">
            Compendium
          </p>
          <p className="mt-1 text-[0.6rem] tracking-[0.45em] uppercase text-zinc-500">
            Gastronômico
          </p>
        </Link>

        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-[0_0_60px_rgba(0,0,0,0.5)] backdrop-blur">
          <h1 className="font-heading text-2xl text-zinc-50">{title}</h1>
          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  )
}