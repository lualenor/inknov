import { InkNovApp } from "@/components/inknov/app";

/**
 * Inknov — PWA de escritura privada.
 * SPA con rutas hash: la navegación completa vive en client components
 * y el service worker guarda el shell para uso offline.
 */
export default function Page() {
  return <InkNovApp />;
}
