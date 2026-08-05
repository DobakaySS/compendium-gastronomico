import Link from "next/link"
import type { Recipe, Tag } from "@/lib/schema"
import { TagBadge } from "@/components/tags/tag-badge"

type RecipeCardProps = {
  recipe: Pick<
    Recipe,
    "id" | "title" | "image_url" | "base_servings" | "prep_time_minutes"
  >
  tags?: Tag[]
}

export function RecipeCard({ recipe, tags = [] }: RecipeCardProps) {
  const hasImage = Boolean(recipe.image_url)

  return (
    <Link
      href={`/r/${recipe.id}`}
      className="group relative block aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-zinc-800 transition-all duration-300 hover:ring-zinc-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
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

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-3 sm:p-4">
        <h3 className="font-heading text-lg leading-tight text-zinc-50 [text-wrap:balance] sm:text-xl">
          {recipe.title}
        </h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.65rem] tracking-[0.18em] uppercase text-zinc-400">
          <span>{recipe.prep_time_minutes ?? "—"} min</span>
          <span aria-hidden className="text-zinc-600">
            ·
          </span>
          <span>{recipe.base_servings ?? "—"} porções</span>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <TagBadge key={tag.id} tag={tag} className="h-4 text-[0.55rem]" />
            ))}
            {tags.length > 3 && (
              <span className="text-[0.55rem] text-zinc-400">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
