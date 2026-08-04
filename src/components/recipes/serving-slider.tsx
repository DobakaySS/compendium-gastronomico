"use client"

import { Slider } from "@/components/ui/slider"
import { formatAmount } from "@/lib/calculations"

type ServingSliderProps = {
  value: number
  onChange: (value: number) => void
  baseServings: number
}

export function ServingSlider({
  value,
  onChange,
  baseServings,
}: ServingSliderProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="mb-1 flex items-baseline justify-between gap-4">
        <span className="text-[0.7rem] tracking-[0.35em] uppercase text-zinc-500">
          Porções
        </span>
        <span className="font-heading text-3xl text-zinc-50">
          {value}
          <span className="ml-1 text-sm text-zinc-500">porções</span>
        </span>
      </div>

      <Slider
        value={[value]}
        min={1}
        max={20}
        step={1}
        onValueChange={(next) => {
          const v = Array.isArray(next) ? next[0] : next
          if (typeof v === "number") onChange(v)
        }}
        className="mt-4"
      />

      <div className="mt-3 flex justify-between text-[0.65rem] tracking-[0.15em] uppercase text-zinc-500">
        <span>1</span>
        <span>Base: {formatAmount(baseServings)}</span>
        <span>20</span>
      </div>
    </div>
  )
}
