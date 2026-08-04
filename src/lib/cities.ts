export const CITIES = [
  "Ouro Branco",
  "Belo Horizonte",
  "São Paulo",
  "Rio de Janeiro",
] as const

export type City = (typeof CITIES)[number]

export const CITY_COOKIE = "cg_city"
export const DEFAULT_CITY: City = "Ouro Branco"

export function isCity(value: string | null | undefined): value is City {
  return !!value && (CITIES as readonly string[]).includes(value)
}
