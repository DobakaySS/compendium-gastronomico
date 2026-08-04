import Link from "next/link"
import type { Recipe } from "@/lib/schema"
import { cn } from "@/lib/utils"

type RecipeCardProps = {
  recipe: Pick<
    Recipe,
    "id" | "title" | "image_url" | "base_servings" | "prep_time_minutes"
  >
  size?: "sm" | "md"
}

export function RecipeCard({ recipe, size = "md" }: RecipeCardProps) {
  const hasImage = Boolean(recipe.image_url)

  return (
    <Link
      href={`/r/${recipe.id}`}
      className={cn(
        "group relative block overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-800 transition-all duration-300 hover:ring-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400",
        size === "md" ? "aspect-[4/5] w-56 shrink-0 snap-center sm:w-64" : "aspect-[4/5] w-48 shrink-0 snap-center"
      )}
    >
      {/* Imagem de fundo ou placeholder */}
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.image_url!}
          alt={recipe.title}
          className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_10%,#33415533_0%,#0c0c0f_65%)]" />
      )}

      {/* Overlay + conteúdo na base */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-900/50 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4">
        <h3 className="font-heading text-xl leading-tight text-zinc-50 [text-wrap:balance]">
          {recipe.title}
        </h3>
        <div className="flex items-center gap-2 text-[0.65rem] tracking-[0.18em] uppercase text-zinc-400">
          <span>{recipe.prep_time_minutes ?? "—"} min</span>
          <span aria-hidden className="text-zinc-600">
            ·
          </span>
          <span>{recipe.base_servings ?? "—"} porções</span>
        </div>
      </div>
    </Link>
  )
}