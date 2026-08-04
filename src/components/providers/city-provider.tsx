"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CITIES, CITY_COOKIE, DEFAULT_CITY, type City } from "@/lib/cities"

type CityContextValue = {
  city: City
  setCity: (city: City) => void
}

const CityContext = React.createContext<CityContextValue | null>(null)

export function CityProvider({
  initialCity,
  children,
}: {
  initialCity: City
  children: React.ReactNode
}) {
  const router = useRouter()
  const [city, setCityState] = React.useState<City>(initialCity)

  const setCity = React.useCallback(
    (next: City) => {
      setCityState(next)
      document.cookie = `${CITY_COOKIE}=${encodeURIComponent(next)};path=/;max-age=31536000;samesite=lax`
      router.refresh()
    },
    [router]
  )

  const value = React.useMemo(() => ({ city, setCity }), [city, setCity])

  return (
    <CityContext.Provider value={value}>{children}</CityContext.Provider>
  )
}

export function useCity(): CityContextValue {
  const ctx = React.useContext(CityContext)
  if (!ctx) {
    return { city: DEFAULT_CITY, setCity: () => undefined }
  }
  return ctx
}

export { CITIES }
