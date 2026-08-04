import { Suspense } from "react"
import { AuthorForm } from "@/components/authors/author-form"

export default async function NewAuthorPage() {
  return (
    <main className="flex flex-1 items-start justify-center px-4 py-10">
      <Suspense>
        <AuthorForm />
      </Suspense>
    </main>
  )
}