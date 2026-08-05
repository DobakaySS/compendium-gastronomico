import { notFound } from "next/navigation"
import Link from "next/link"
import dayjs from "dayjs"
import { createClient } from "@/lib/supabase/server"
import { userRole, canWrite } from "@/lib/roles"
import { PriceForm } from "@/components/ingredients/price-form"
import { Separator } from "@/components/ui/separator"

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
}

type PriceHistoryRow = {
  id: string
  city: string
  price: number
  currency: string
  reference_amount: number
  reference_unit: string
  recorded_on: string
}

function formatMacro(value: number | null): string {
  return value != null ? String(value) : "—"
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(price)
}

function formatDate(date: string): string {
  const d = dayjs(date)
  return d.isValid() ? d.format("DD/MM/YYYY") : date
}

export default async function IngredientDetailPage({
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

  const { data: ingredient, error } = await supabase
    .from("ingredients")
    .select(
      "id, name, default_unit, grams_per_unit, kcal_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g"
    )
    .eq("id", id)
    .maybeSingle()

  if (error || !ingredient) {
    notFound()
  }

  const row = ingredient as IngredientRow

  const { data: priceRows, error: priceError } = await supabase
    .from("ingredient_prices")
    .select(
      "id, city, price, currency, reference_amount, reference_unit, recorded_on"
    )
    .eq("ingredient_id", id)
    .order("recorded_on", { ascending: false })

  if (priceError) {
    throw new Error(priceError.message)
  }

  const prices = (priceRows ?? []) as PriceHistoryRow[]

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <Link
            href="/ingredients"
            className="inline-flex items-center gap-1 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-500 transition-colors hover:text-zinc-200"
          >
            ← Voltar ao catálogo
          </Link>
          <h1 className="mt-2 font-heading text-3xl text-zinc-50">
            {row.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {row.default_unit ?? "sem unidade padrão"}
            {row.default_unit === "unidade" && row.grams_per_unit != null && (
              <span> · ≈{row.grams_per_unit}g/unidade</span>
            )}
          </p>
        </div>
        {writer && (
          <Link
            href={`/ingredients/${id}/edit`}
            className="mb-1 shrink-0 rounded-full border border-zinc-700 px-4 py-2 text-[0.7rem] tracking-[0.2em] uppercase text-zinc-300 transition-colors hover:bg-zinc-800"
          >
            Editar
          </Link>
        )}
      </div>

      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <p className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
            Calorias
          </p>
          <p className="mt-1 font-heading text-2xl text-zinc-300">
            {formatMacro(row.kcal_per_100g)}
            <span className="ml-1 text-xs text-zinc-500">kcal</span>
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <p className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
            Proteína
          </p>
          <p className="mt-1 font-heading text-2xl text-zinc-300">
            {formatMacro(row.protein_per_100g)}
            <span className="ml-1 text-xs text-zinc-500">g</span>
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <p className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
            Carboidratos
          </p>
          <p className="mt-1 font-heading text-2xl text-zinc-300">
            {formatMacro(row.carbs_per_100g)}
            <span className="ml-1 text-xs text-zinc-500">g</span>
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
          <p className="text-[0.65rem] tracking-[0.2em] uppercase text-zinc-500">
            Gorduras
          </p>
          <p className="mt-1 font-heading text-2xl text-zinc-300">
            {formatMacro(row.fat_per_100g)}
            <span className="ml-1 text-xs text-zinc-500">g</span>
          </p>
        </div>
      </div>

      <Separator className="bg-zinc-800" />

      {writer && (
        <section className="mt-10">
          <h2 className="mb-4 text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
            Registrar novo preço
          </h2>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
            <PriceForm ingredientId={id} />
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
          Histórico de preços
        </h2>

        {prices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-12 text-center">
            <p className="text-sm text-zinc-500">
              Nenhum preço registrado para este ingrediente.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {prices.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-5 py-4"
              >
                <div className="min-w-0">
                  <p className="flex items-baseline gap-2 text-base font-medium text-zinc-100">
                    {formatPrice(p.price)}
                    <span className="text-xs text-zinc-500">
                      / {p.reference_amount}{p.reference_unit}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {p.city} · {formatDate(p.recorded_on)}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-zinc-800 px-3 py-1.5 text-[0.65rem] tracking-[0.2em] uppercase text-zinc-400">
                  {p.city}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
