import { Suspense } from "react"
import { RecipeBuilder } from "@/components/recipes/recipe-builder"

export default async function NewRecipePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <span className="text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
          Estúdio
        </span>
        <h1 className="mt-2 font-heading text-3xl text-zinc-50">Nova receita</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Defina porções-base, passos, ingredientes e autores.
        </p>
        <div className="mt-8">
          <Suspense>
            <RecipeBuilder />
          </Suspense>
        </div>
      </main>
  )
}