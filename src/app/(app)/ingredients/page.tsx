import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { userRole, canWrite } from "@/lib/roles"
import { getCityFromCookies } from "@/lib/get-city"
import { PriceMattersToggle } from "@/components/ingredients/price-matters-toggle"

export const revalidate = 0

type IngredientRow = {
  id: string
  name: string
  default_unit: string | null
  grams_per_unit: number | null
  kcal_per_100g: number | null
  protein_per_100g: number | null
  carbs_per_100g: number | null
  fat_per_100g: number | null
  price_matters: boolean
}

type PriceRow = {
  ingredient_id: string
  price: number
  currency: string
  reference_amount: number
  reference_unit: string
}

type PricePreview = {
  price: number
  currency: string
  reference_amount: number
  reference_unit: string
}

function formatMacro(value: number | null): string {
  return value != null ? String(value) : "—"
}

function formatGramsPerUnit(value: number | null): string {
  return value != null ? String(value) : "—"
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(price)
}

export default async function IngredientsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const role = userRole(user)
  const writer = canWrite(role)

  const city = await getCityFromCookies()

  const { data: ingredients, error } = await supabase
    .from("ingredients")
    .select(
      "id, name, default_unit, grams_per_unit, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, price_matters"
    )
    .order("name")

  if (error) {
    throw new Error(error.message)
  }

  const rows = (ingredients ?? []) as IngredientRow[]

  const latestPrices = new Map<string, PricePreview>()
  if (rows.length > 0) {
    const { data: priceRows, error: priceError } = await supabase
      .from("ingredient_prices")
      .select(
        "ingredient_id, price, currency, reference_amount, reference_unit, recorded_on"
      )
      .in(
        "ingredient_id",
        rows.map((r) => r.id)
      )
      .eq("city", city)
      .order("recorded_on", { ascending: false })

    if (priceError) {
      throw new Error(priceError.message)
    }

    for (const p of (priceRows ?? []) as PriceRow[]) {
      if (latestPrices.has(p.ingredient_id)) continue
      latestPrices.set(p.ingredient_id, {
        price: Number(p.price),
        currency: p.currency,
        reference_amount: Number(p.reference_amount),
        reference_unit: p.reference_unit,
      })
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <span className="text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
              Catálogo
            </span>
            <h1 className="mt-2 font-heading text-3xl text-zinc-50">
              Ingredientes
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {rows.length} alimento(s) com macros por 100g.
            </p>
          </div>
          {writer && (
            <Link
              href="/ingredients/new"
              className="mb-1 shrink-0 rounded-full border border-zinc-700 px-4 py-2 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              + Novo
            </Link>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-6 rounded-2xl border border-dashed border-zinc-800 px-6 py-20 text-center">
            <h2 className="font-heading text-2xl text-zinc-200">
              Nenhum ingrediente cadastrado
            </h2>
            <p className="max-w-sm text-sm text-zinc-500">
              {writer
                ? "Registre alimentos para usá-los nas receitas e calcular macros."
                : "Os ingredientes ainda não foram cadastrados."}
            </p>
            {writer && (
              <Link
                href="/ingredients/new"
                className="rounded-full border border-zinc-700 px-6 py-2.5 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                Cadastrar ingrediente
              </Link>
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((ing) => (
              <li
                key={ing.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-zinc-100">
                    {ing.name}
                    {ing.default_unit === "unidade" &&
                      (ing.grams_per_unit == null ? (
                        <span className="ml-2 inline-block rounded-full border border-amber-900/60 bg-amber-950/30 px-2 py-0.5 text-[0.6rem] tracking-wide text-amber-300/90">
                          sem g/unidade
                        </span>
                      ) : (
                        <span className="ml-2 inline-block rounded-full border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-[0.6rem] tracking-wide text-zinc-400">
                          ≈{formatGramsPerUnit(ing.grams_per_unit)}g/unidade
                        </span>
                      ))}
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {ing.default_unit ?? "sem unidade padrão"} ·{" "}
                    {formatMacro(ing.kcal_per_100g)} kcal · P{" "}
                    {formatMacro(ing.protein_per_100g)}g · C{" "}
                    {formatMacro(ing.carbs_per_100g)}g · G{" "}
                    {formatMacro(ing.fat_per_100g)}g /100g
                  </p>
                  {ing.price_matters &&
                    (() => {
                      const price = latestPrices.get(ing.id)
                      return (
                        <p className="mt-0.5 text-sm">
                          {price ? (
                            <span className="text-zinc-300">
                              {formatPrice(price.price)}
                              <span className="text-zinc-500">
                                {" "}
                                / {price.reference_amount}
                                {price.reference_unit}
                                <span className="ml-1.5 inline-block rounded-full border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 text-[0.6rem] tracking-wide text-zinc-400">
                                  {city}
                                </span>
                              </span>
                            </span>
                          ) : (
                            <span className="inline-block rounded-full border border-amber-900/60 bg-amber-950/30 px-2 py-0.5 text-[0.6rem] tracking-wide text-amber-300/90">
                              sem preço em {city}
                            </span>
                          )}
                        </p>
                      )
                    })()}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {writer && (
                    <PriceMattersToggle
                      ingredientId={ing.id}
                      checked={ing.price_matters}
                    />
                  )}
                  <Link
                    href={`/ingredients/${ing.id}`}
                    className="rounded-full border border-zinc-800 px-3 py-1.5 text-[0.65rem] tracking-[0.2em] uppercase text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-100"
                  >
                    {writer ? "Preços" : "Ver"}
                  </Link>
                  {writer && (
                    <Link
                      href={`/ingredients/${ing.id}/edit`}
                      className="rounded-full border border-zinc-800 px-3 py-1.5 text-[0.65rem] tracking-[0.2em] uppercase text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-100"
                    >
                      Macros
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
    </main>
  )
}
