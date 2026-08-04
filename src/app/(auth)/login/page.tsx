import { Suspense } from "react"
import { LoginForm } from "@/components/auth/login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await searchParams
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <Suspense>
        <LoginForm next={next} />
      </Suspense>
    </main>
  )
}