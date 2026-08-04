import { Suspense } from "react"
import { IngredientForm } from "@/components/ingredients/ingredient-form"
import { AppHeader } from "@/components/layout/app-header"

export default async function NewIngredientPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <span className="text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
          Catálogo
        </span>
        <h1 className="mt-2 font-heading text-3xl text-zinc-50">
          Novo ingrediente
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Adicione um alimento ao catálogo e informe os macros por 100g.
        </p>
        <div className="mt-8">
          <Suspense>
            <IngredientForm />
          </Suspense>
        </div>
      </main>
    </div>
  )
}