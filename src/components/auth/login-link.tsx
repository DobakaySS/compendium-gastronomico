import Link from "next/link"

export function LoginLink() {
  return (
    <Link
      href="/login"
      className="rounded-full px-3 py-1.5 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-300 transition-colors hover:text-zinc-100"
    >
      Entrar
    </Link>
  )
}