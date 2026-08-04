import { AppHeader } from "@/components/layout/app-header"
import { SmartImportForm } from "@/components/recipes/smart-import-form"

export default function SmartImportPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:py-10">
        <div className="mb-8">
          <span className="text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
            Importação inteligente
          </span>
          <h1 className="font-heading text-3xl text-zinc-50 sm:text-4xl [text-wrap:balance]">
            Smart Import
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">
            Cole uma receita em texto livre (site, blog, anotação) e a IA
            extrai título, ingredientes, instruções e técnicas.
          </p>
        </div>

        <SmartImportForm />
      </main>
    </div>
  )
}
