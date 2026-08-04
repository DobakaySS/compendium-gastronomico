"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ImportConfirmation } from "@/components/recipes/import-confirmation"
import { parseRecipeAction } from "@/app/actions/ai-parser"
import type { ParseResult } from "@/app/actions/ai-parser"
import { SparklesIcon } from "lucide-react"

export function SmartImportForm() {
  const [rawText, setRawText] = useState("")
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<ParseResult | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleParse = async () => {
    if (!rawText.trim()) {
      toast.error("Cole o texto da receita antes de processar.")
      return
    }

    setProcessing(true)
    const loadingId = toast.loading("Analisando receita com IA...")
    try {
      const res = await parseRecipeAction(rawText)
      toast.dismiss(loadingId)

      if (res.ok) {
        setResult(res.data)
        setDialogOpen(true)
        toast.success("Receita analisada com sucesso")
      } else {
        toast.error(res.error)
      }
    } catch {
      toast.dismiss(loadingId)
      toast.error("Erro inesperado ao processar a receita.")
    } finally {
      setProcessing(false)
    }
  }

  const handleClose = () => {
    setDialogOpen(false)
    setResult(null)
    setRawText("")
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
          <Textarea
            placeholder="Cole aqui o texto completo da receita..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={14}
            disabled={processing}
            className="min-h-[200px] resize-y border-0 bg-transparent p-0 text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-0"
          />
        </div>

        <div className="flex items-center gap-4">
          <Button
            type="button"
            onClick={handleParse}
            disabled={processing || !rawText.trim()}
            className="rounded-full px-7"
          >
            <SparklesIcon className="size-4" />
            {processing ? "Processando..." : "Processar com IA"}
          </Button>

          {rawText.trim() && (
            <span className="text-xs text-zinc-500">
              {rawText.length} caracteres
            </span>
          )}
        </div>

        <div className="rounded-2xl border border-dashed border-zinc-800 p-6">
          <p className="text-[0.7rem] tracking-[0.2em] uppercase text-zinc-500">
            Dicas
          </p>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-xs text-zinc-400">
            <li>
              Quanto mais completo o texto, melhor a extração (inclua título,
              ingredientes com quantidades e modo de preparo).
            </li>
            <li>
              A IA identifica técnicas culinárias (refogar, assar, emulsionar,
              etc.) e as classifica automaticamente.
            </li>
            <li>
              Ingredientes são comparados com o seu catálogo do Compendium.
              Os que não forem encontrados poderão ser criados.
            </li>
          </ul>
        </div>
      </div>

      {result && (
        <ImportConfirmation
          open={dialogOpen}
          onOpenChange={handleClose}
          parsed={result}
        />
      )}
    </>
  )
}
