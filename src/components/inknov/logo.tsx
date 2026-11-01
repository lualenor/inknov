"use client";

import { useId } from "react";

/**
 * Insignia de Inknov en SVG: círculo negro con anillos dorados,
 * libro abierto y la palabra "Inknov" curvada en la parte inferior
 * (réplica vectorial del logo metálico de referencia).
 */
export function LogoBadge({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/[:]/g, "");
  const gold = `url(#inknov-gold-${uid})`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Insignia de Inknov"
    >
      <defs>
        <linearGradient id={`inknov-gold-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F1D27A" />
          <stop offset="0.55" stopColor="#C9A227" />
          <stop offset="1" stopColor="#8C6D1F" />
        </linearGradient>
      </defs>

      <circle cx="50" cy="50" r="49" fill="#17120C" />
      <circle cx="50" cy="50" r="44.5" fill="none" stroke={gold} strokeWidth="2.4" />
      <circle cx="50" cy="50" r="40.8" fill="none" stroke="#8C6D1F" strokeWidth="0.9" />
      <circle cx="50" cy="50" r="39.2" fill="none" stroke="#C9A227" strokeWidth="0.5" opacity="0.8" />

      {/* Libro abierto */}
      <g
        fill="#EFD68A"
        stroke="#8C6D1F"
        strokeWidth="1.1"
        strokeLinejoin="round"
      >
        <path d="M50 41 C 44.5 35.5, 35.5 34.8, 31.5 37.2 L 31.5 54.5 C 35.5 52.2, 44.5 52.8, 50 57 Z" />
        <path d="M50 41 C 55.5 35.5, 64.5 34.8, 68.5 37.2 L 68.5 54.5 C 64.5 52.2, 55.5 52.8, 50 57 Z" />
      </g>
      <path d="M34 42.5 C 38 41.2, 44 41.6, 47.5 43.6" fill="none" stroke="#C9A227" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M34 46.5 C 38 45.2, 44 45.6, 47.5 47.6" fill="none" stroke="#C9A227" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M66 42.5 C 62 41.2, 56 41.6, 52.5 43.6" fill="none" stroke="#C9A227" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M66 46.5 C 62 45.2, 56 45.6, 52.5 47.6" fill="none" stroke="#C9A227" strokeWidth="0.9" strokeLinecap="round" />
      <line x1="50" y1="41" x2="50" y2="57" stroke="#8C6D1F" strokeWidth="1.4" />
      <path d="M29.5 60.5 Q 50 65.5, 70.5 60.5" fill="none" stroke="#C9A227" strokeWidth="1.6" strokeLinecap="round" />

      {/* Brillitos */}
      <circle cx="20.5" cy="26.5" r="1.6" fill="#EFD68A" />
      <circle cx="79.5" cy="26.5" r="1.6" fill="#EFD68A" />

      {/* Palabra Inknov en arco inferior */}
      <path id={`inknov-arc-${uid}`} d="M 24 65 A 30 30 0 0 0 76 65" fill="none" />
      <text
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="10.5"
        fontWeight="700"
        fill="#EFD68A"
        letterSpacing="1.5"
      >
        <textPath href={`#inknov-arc-${uid}`} startOffset="50%" textAnchor="middle">
          Inknov
        </textPath>
      </text>
    </svg>
  );
}

/** Iniciales para el avatar (ej. "Luisa Restrepo" → "LR"). */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "✎";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}
