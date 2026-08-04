"use client"

import { MapPinIcon } from "lucide-react"
import { useCity, CITIES } from "@/components/providers/city-provider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function CitySelector() {
  const { city, setCity } = useCity()

  return (
    <div className="flex items-center gap-1.5">
      <MapPinIcon className="size-3.5 text-zinc-500" />
      <Select value={city} onValueChange={(v) => setCity(v as (typeof CITIES)[number])}>
        <SelectTrigger
          size="sm"
          aria-label="Cidade para cálculo de preços"
          className="border-transparent bg-transparent text-[0.7rem] tracking-[0.15em] uppercase text-zinc-300 hover:bg-zinc-800/60 data-[size=sm]:h-7"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CITIES.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
