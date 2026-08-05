import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { userRole, canWrite } from "@/lib/roles"
import { loginAsVisitor } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { RecipeCard } from "@/components/recipes/recipe-card"

export const revalidate = 0

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = userRole(user)

  // Visitante puro (sem sessão): landing editorial com entradas.
  if (!user) {
    return (
      <main className="relative flex flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,#33415540_0%,transparent_60%)]" />
        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
          <span className="text-[0.7rem] tracking-[0.4em] uppercase text-zinc-500">
            Smart Recipe Collection
          </span>
          <h1 className="font-heading text-5xl leading-[1.05] text-zinc-50 [text-wrap:balance] sm:text-6xl">
            Compendium <br /> Gastronômico
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-zinc-400">
            Receitas com porções dinâmicas, macros precisos e evolução
            colaborativa. Sua coleção culinária, elevada.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button
              size="lg"
              nativeButton={false}
              render={<Link href="/login" />}
              className="rounded-full px-7"
            >
              Entrar
            </Button>
            <form action={loginAsVisitor}>
              <Button
                variant="outline"
                size="lg"
                className="rounded-full px-7"
              >
                Entrar como visitante
              </Button>
            </form>
          </div>
        </div>
      </main>
    )
  }

  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, title, image_url, base_servings, prep_time_minutes, created_at")
    .is("parent_recipe_id", null)
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const writer = canWrite(role)

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-12">
        <div className="mb-8 flex flex-col gap-2">
          <span className="text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
            {writer ? "Coleção" : "Visitação"}
          </span>
          <div className="flex items-end justify-between gap-4">
            <h1 className="font-heading text-3xl text-zinc-50 sm:text-4xl">
              {writer ? "Suas receitas" : "Receitas"}
            </h1>
            {writer && (
              <Link
                href="/recipes/new"
                className="mb-1 shrink-0 rounded-full border border-zinc-700 px-4 py-2 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                + Nova
              </Link>
            )}
          </div>
          {!writer && (
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
              Modo visitante · apenas visualização
            </p>
          )}
        </div>

        {recipes.length === 0 ? (
          <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-zinc-800 px-6 py-20 text-center">
            <h2 className="font-heading text-2xl text-zinc-200">
              Nenhuma receita no compêndium
            </h2>
            <p className="max-w-sm text-sm text-zinc-500">
              {writer
                ? "Registre sua primeira receita para começar a construir o compêndium."
                : "As receitas ainda não foram publicadas."}
            </p>
            {writer && (
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href="/recipes/new" />}
                className="rounded-full px-7"
              >
                Criar receita
              </Button>
            )}
          </div>
        ) : (
          <>
            <p className="mb-4 text-[0.7rem] tracking-[0.3em] uppercase text-zinc-500">
              Recentes
            </p>
            <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          </>
        )}
      </main>
  )
}