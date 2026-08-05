"use client"

import { Slider } from "@/components/ui/slider"

type ServingSliderProps = {
  value: number
  onChange: (value: number) => void
}

export function ServingSlider({ value, onChange }: ServingSliderProps) {
  return (
    <div className="flex items-center gap-4">
      <span className="shrink-0 text-[0.7rem] tracking-[0.3em] uppercase text-zinc-500">
        Porções
      </span>
      <Slider
        value={[value]}
        min={1}
        max={20}
        step={1}
        onValueChange={(next) => {
          const v = Array.isArray(next) ? next[0] : next
          if (typeof v === "number") onChange(v)
        }}
        className="flex-1"
      />
      <span className="shrink-0 font-heading text-2xl text-zinc-50">
        {value}
      </span>
    </div>
  )
}
