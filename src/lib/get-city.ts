import "server-only"
import { cookies } from "next/headers"
import { CITY_COOKIE, DEFAULT_CITY, isCity, type City } from "@/lib/cities"

export async function getCityFromCookies(): Promise<City> {
  const cookieStore = await cookies()
  const value = cookieStore.get(CITY_COOKIE)?.value ?? null
  return isCity(value) ? value : DEFAULT_CITY
}
