import { notFound } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Separator } from "@/components/ui/separator"
import { RecipeViewer } from "@/components/recipes/recipe-viewer"
import type { TimelineLog } from "@/components/recipes/recipe-timeline"
import { userRole, canWrite } from "@/lib/roles"
import { CITIES, type City } from "@/lib/cities"
import type { ViewerIngredient } from "@/lib/calculations"
import type {
  RecipeVersion,
  RecipeIngredientWithMacros,
  Tag,
} from "@/lib/schema"

type RecipeRow = {
  id: string
  title: string
  image_url: string | null
  techniques: unknown
  base_servings: number | null
  prep_time_minutes: number | null
  effort_level: number | null
  instructions: Array<string | { text: string }> | null
  parent_recipe_id: string | null
  version_name: string | null
  created_at: string | null
  recipe_authors: Array<{ author_id: string; authors: unknown }>
  recipe_ingredients: RecipeIngredientWithMacros[]
  recipe_tags: Array<{
    tag_id: string
    tags: { id: string; name: string; color: string } | { id: string; name: string; color: string }[] | null
  }>
}

type VersionRow = {
  id: string
  title: string
  image_url: string | null
  base_servings: number | null
  prep_time_minutes: number | null
  effort_level: number | null
  version_name: string | null
  instructions: Array<string | { text: string }> | null
  created_at: string | null
}

type PriceRow = {
  ingredient_id: string
  city: string
  price: number
  currency: string
  reference_amount: number
  reference_unit: string
  recorded_on: string
}

function toObject<T>(raw: T | T[] | null | undefined): T | null {
  if (!raw) return null
  if (Array.isArray(raw)) return raw[0] ?? null
  return raw as T
}

function normalizeIngredientName(raw: unknown): string {
  const obj = toObject(raw as { name?: string })
  return (obj as { name?: string } | null)?.name ?? ""
}

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const writer = canWrite(userRole(user))

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select(
      `id,
       title,
       image_url,
       techniques,
       base_servings,
       prep_time_minutes,
       effort_level,
       instructions,
       parent_recipe_id,
       version_name,
       created_at,
       recipe_authors(author_id, authors(name)),
        recipe_tags(tag_id, tags(id, name, color)),
        recipe_ingredients(
            ingredient_id,
            amount_used,
            unit,
            ingredients(id, name, grams_per_unit, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, price_matters)
          )`
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !recipe) {
    notFound()
  }

  const row = recipe as unknown as RecipeRow

  // --- 1. Versões (família) -----------------------------------------------
  const familyParentId = row.parent_recipe_id ?? row.id

  const { data: versionRows, error: versionError } = await supabase
    .from("recipes")
    .select(
      `id,
       title,
       image_url,
       base_servings,
       prep_time_minutes,
       effort_level,
       version_name,
       instructions,
       created_at`
    )
    .or(`parent_recipe_id.eq.${familyParentId},id.eq.${familyParentId}`)
    .order("created_at", { ascending: true })

  if (versionError) {
    throw new Error(versionError.message)
  }

  const versions: RecipeVersion[] = (versionRows as VersionRow[] | null)?.map(
    (v) => ({
      id: v.id,
      title: v.title,
      version_name: v.version_name,
      image_url: v.image_url,
      base_servings: Number(v.base_servings ?? 1),
      prep_time_minutes: v.prep_time_minutes != null ? Number(v.prep_time_minutes) : null,
      effort_level: v.effort_level != null ? Number(v.effort_level) : null,
      instructions: Array.isArray(v.instructions) ? v.instructions : [],
      created_at: v.created_at ?? "",
    })
  ) ?? []

  const versionIds = versions.map((v) => v.id)

  // --- 2. Ingredientes + macros por versão --------------------------------
  const { data: ingredientRows, error: ingredientError } = await supabase
    .from("recipe_ingredients")
    .select(
       `recipe_id,
        ingredient_id,
        amount_used,
        unit,
        ingredients(id, name, grams_per_unit, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, price_matters)`
    )
    .in("recipe_id", versionIds)

  if (ingredientError) {
    throw new Error(ingredientError.message)
  }

  const ingredientsByVersion = new Map<string, ViewerIngredient[]>()
  for (const raw of ingredientRows ?? []) {
    const r = raw as RecipeIngredientWithMacros & { recipe_id: string }
    const ing = toObject(r.ingredients)
    const line: ViewerIngredient = {
      id: r.ingredient_id,
      name: normalizeIngredientName(ing),
      unit: r.unit ?? "",
      amount_used: Number(r.amount_used ?? 0),
      grams_per_unit: ing?.grams_per_unit != null ? Number(ing.grams_per_unit) : null,
      kcal_per_100g: ing?.kcal_per_100g != null ? Number(ing.kcal_per_100g) : null,
      protein_per_100g: ing?.protein_per_100g != null ? Number(ing.protein_per_100g) : null,
      carbs_per_100g: ing?.carbs_per_100g != null ? Number(ing.carbs_per_100g) : null,
      fat_per_100g: ing?.fat_per_100g != null ? Number(ing.fat_per_100g) : null,
      price_matters: ing?.price_matters ?? true,
      price: null,
      currency: "BRL",
      reference_amount: null,
      reference_unit: null,
    }
    const list = ingredientsByVersion.get(r.recipe_id) ?? []
    list.push(line)
    ingredientsByVersion.set(r.recipe_id, list)
  }

  // --- 2b. Logs do caderno de experimentos por família ------------------
  const logsByVersion: Record<string, TimelineLog[]> = {}

  if (versionIds.length > 0) {
    const { data: logRowsRaw } = await supabase
      .from("recipe_logs")
      .select("id, recipe_id, user_id, note, created_at, authors(name)")
      .in("recipe_id", versionIds)
      .order("created_at", { ascending: false })

    for (const row of logRowsRaw ?? []) {
      const raw = row as {
        id: string
        recipe_id: string
        user_id: string
        note: string | null
        created_at: string
        authors: { name: string } | { name: string }[] | null
      }
      const authorName = raw.authors
        ? Array.isArray(raw.authors)
          ? (raw.authors[0] as { name?: string } | undefined)?.name ?? ""
          : (raw.authors as { name?: string }).name ?? ""
        : ""
      const entry: TimelineLog = {
        id: raw.id,
        user_id: raw.user_id,
        note: raw.note,
        created_at: raw.created_at,
        author_name: authorName,
      }
      const list = logsByVersion[raw.recipe_id] ?? []
      list.push(entry)
      logsByVersion[raw.recipe_id] = list
    }
  }

  // --- 2c. Autores para o selector do form de log -----------------------
  const { data: allAuthors } = await supabase
    .from("authors")
    .select("id, name")
    .order("name")

  const authorOptions = (allAuthors ?? []).map(
    (a: { id: string; name: string }) => ({
      id: a.id,
      name: a.name,
    })
  )

  // --- 3. Preços por cidade (mais recentes) -------------------------------
  const allIngredientIds = Array.from(
    new Set(
      Array.from(ingredientsByVersion.values())
        .flat()
        .map((i) => i.id)
    )
  )

  const pricesByCity = new Map<City, Map<string, Omit<ViewerIngredient, "name" | "unit" | "amount_used" | "grams_per_unit" | "price_matters" | "kcal_per_100g" | "protein_per_100g" | "carbs_per_100g" | "fat_per_100g">>>()
  CITIES.forEach((c) => pricesByCity.set(c, new Map()))

  if (allIngredientIds.length > 0) {
    const { data: priceRows, error: priceError } = await supabase
      .from("ingredient_prices")
      .select(
        `ingredient_id,
         city,
         price,
         currency,
         reference_amount,
         reference_unit,
         recorded_on`
      )
      .in("ingredient_id", allIngredientIds)
      .in("city", CITIES as unknown as string[])
      .order("recorded_on", { ascending: false })

    if (priceError) {
      throw new Error(priceError.message)
    }

    for (const p of (priceRows as PriceRow[] | null) ?? []) {
      const city = p.city as City
      const cityMap = pricesByCity.get(city)
      if (!cityMap || cityMap.has(p.ingredient_id)) continue
      cityMap.set(p.ingredient_id, {
        id: p.ingredient_id,
        price: Number(p.price),
        currency: p.currency,
        reference_amount: Number(p.reference_amount),
        reference_unit: p.reference_unit,
      })
    }
  }

  // --- 3b. Tags por versão (cada versão pode ter tags diferentes) ----------
  const tagsByVersion: Record<string, Tag[]> = {}

  if (versionIds.length > 0) {
    const { data: tagRowsRaw } = await supabase
      .from("recipe_tags")
      .select("recipe_id, tag_id, tags(id, name, color)")
      .in("recipe_id", versionIds)

    for (const row of tagRowsRaw ?? []) {
      const raw = row as {
        recipe_id: string
        tags:
          | { id: string; name: string; color: string }
          | Array<{ id: string; name: string; color: string }>
          | null
      }
      const tag = toObject(raw.tags)
      if (!tag) continue
      const list = tagsByVersion[raw.recipe_id] ?? []
      list.push({
        id: tag.id,
        name: tag.name,
        color: tag.color,
      })
      tagsByVersion[raw.recipe_id] = list
    }
  }

  const serializeMap = (
    map: Map<string, Omit<ViewerIngredient, "name" | "unit" | "amount_used" | "grams_per_unit" | "price_matters" | "kcal_per_100g" | "protein_per_100g" | "carbs_per_100g" | "fat_per_100g">>
  ) => Object.fromEntries(map.entries())

  const pricesByCitySerialized = Object.fromEntries(
    Array.from(pricesByCity.entries()).map(([city, map]) => [
      city,
      serializeMap(map),
    ])
  ) as Record<City, Record<string, Omit<ViewerIngredient, "name" | "unit" | "amount_used" | "grams_per_unit" | "price_matters" | "kcal_per_100g" | "protein_per_100g" | "carbs_per_100g" | "fat_per_100g">>>

  const ingredientsByVersionSerialized = Array.from(
    ingredientsByVersion.entries()
  ).reduce<Record<string, ViewerIngredient[]>>((acc, [recipeId, lines]) => {
    acc[recipeId] = lines
    return acc
  }, {})

  // --- 4. Autores ----------------------------------------------------------
  const authors = (row.recipe_authors ?? [])
    .map((a) => toObject(a.authors))
    .map((a) => (a as { name?: string } | null)?.name ?? "")
    .filter(Boolean) as string[]

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-500 transition-colors hover:text-zinc-200"
          >
            ← Voltar às receitas
          </Link>
          {writer && (
            <Link
              href={`/recipes/${id}/edit`}
              className="inline-flex items-center rounded-full border border-zinc-700 px-3 py-1.5 text-[0.65rem] tracking-[0.2em] uppercase text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
            >
              Editar
            </Link>
          )}
        </div>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-zinc-900 ring-1 ring-zinc-800">
          {row.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={row.image_url}
              alt={row.title}
              className="aspect-[16/10] w-full object-cover"
            />
          ) : (
            <div className="aspect-[16/10] w-full bg-[radial-gradient(120%_120%_at_50%_10%,#33415533_0%,#0c0c0f_65%)]" />
          )}
        </div>

        {/* Título + meta */}
        <div className="mt-8 text-center">
          <h1 className="font-heading text-4xl text-zinc-50 sm:text-5xl [text-wrap:balance]">
            {row.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-500">
            <span>{row.prep_time_minutes ?? "—"} min</span>
            <span aria-hidden className="text-zinc-700">·</span>
            <span>{row.base_servings ?? "—"} porções</span>
            <span aria-hidden className="text-zinc-700">·</span>
            <span>Esforço {row.effort_level ?? "—"}/5</span>
          </div>
        </div>

        {/* Autores */}
        {authors.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-zinc-800 text-sm font-medium text-zinc-100 ring-1 ring-zinc-700">
              {authors[0].charAt(0).toUpperCase()}
            </span>
            <div className="text-left">
              <p className="text-[0.7rem] tracking-[0.25em] uppercase text-zinc-100">
                {authors.join(" · ")}
              </p>
              <p className="text-xs text-zinc-500">Autor(es)</p>
            </div>
          </div>
        )}

        <Separator className="mt-10 bg-zinc-800" />

        {/* Viewer interativo (versões, slider, macros, despensa) */}
        <RecipeViewer
          currentRecipeId={row.id}
          versions={versions}
          ingredientsByVersion={ingredientsByVersionSerialized}
          pricesByCity={pricesByCitySerialized}
          logsByVersion={logsByVersion}
          tagsByVersion={tagsByVersion}
          authors={authorOptions}
          canWrite={writer}
          currentUserId={user?.id ?? null}
        />
      </main>
  )
}
