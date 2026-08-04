import { Suspense } from "react"
import { IngredientForm } from "@/components/ingredients/ingredient-form"

export default async function NewIngredientPage() {
  return (
    <main className="flex flex-1 items-start justify-center px-4 py-10">
      <Suspense>
        <IngredientForm />
      </Suspense>
    </main>
  )
}