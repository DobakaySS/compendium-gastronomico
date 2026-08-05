import { Suspense } from "react"
import { AuthorForm } from "@/components/authors/author-form"

export default async function NewAuthorPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <span className="text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
          Estúdio
        </span>
        <h1 className="mt-2 font-heading text-3xl text-zinc-50">Novo autor</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Cadastre um autor para atribuir às receitas do compêndium.
        </p>
        <div className="mt-8">
          <Suspense>
            <AuthorForm />
          </Suspense>
        </div>
      </main>
  )
}