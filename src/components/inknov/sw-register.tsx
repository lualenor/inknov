"use client";

import { useEffect } from "react";

/** Registra el service worker (solo en producción para no interferir con HMR). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* silencioso: la app funciona igual sin SW */
      });
    }
  }, []);
  return null;
}
