"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registro falhou — o app segue funcionando normalmente sem o SW.
    })
  }, [])

  return null
}