import { Suspense } from "react"
import { RecipeBuilder } from "@/components/recipes/recipe-builder"

export default async function NewRecipePage() {
  return (
    <main className="flex flex-1 items-start justify-center px-4 py-10">
      <Suspense>
        <RecipeBuilder />
      </Suspense>
    </main>
  )
}