"use client"

import * as React from "react"
import { SearchIcon, XIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { RecipeCard } from "@/components/recipes/recipe-card"
import type { Recipe, Tag } from "@/lib/schema"

type RecipeCollectionItem = {
  recipe: Pick<
    Recipe,
    "id" | "title" | "image_url" | "base_servings" | "prep_time_minutes"
  >
  tags: Tag[]
}

type Props = {
  items: RecipeCollectionItem[]
}

export function RecipeCollection({ items }: Props) {
  const [query, setQuery] = React.useState("")

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(({ recipe, tags }) => {
      if (recipe.title.toLowerCase().includes(q)) return true
      return tags.some((tag) => tag.name.toLowerCase().includes(q))
    })
  }, [items, query])

  return (
    <div>
      <div className="relative mb-5">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou tag..."
          className="h-10 rounded-full border-zinc-800 bg-zinc-900/60 pl-9 pr-9 text-sm text-zinc-100"
          aria-label="Buscar receitas por nome ou tag"
        />
        {query && (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => setQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-zinc-500 transition-colors hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-zinc-400"
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center">
          <p className="font-heading text-xl text-zinc-200">
            Nenhuma receita encontrada
          </p>
          <p className="text-sm text-zinc-500">
            Tente buscar por outro nome ou tag.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {filtered.map(({ recipe, tags }) => (
            <RecipeCard key={recipe.id} recipe={recipe} tags={tags} />
          ))}
        </div>
      )}
    </div>
  )
}
