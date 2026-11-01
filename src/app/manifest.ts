import type { MetadataRoute } from "next";

/** Manifiesto PWA: permite "Instalar" Inknov en la pantalla de inicio. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Inknov — Escritura y proyectos creativos",
    short_name: "Inknov",
    description:
      "Tu espacio privado para escribir: proyectos, notas con imágenes y exportación a Word.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4EFE3",
    theme_color: "#F4EFE3",
    lang: "es",
    categories: ["productivity", "education", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
