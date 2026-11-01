"use client";

/** Tipos compartidos del frontend Inknov. */

export type SessionUser = {
  id: string;
  name: string;
  email: string;
};

export type Project = {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
  _count?: { notes: number };
};

export type NoteSummary = {
  id: string;
  title: string;
  plainText: string;
  createdAt: string;
  updatedAt: string;
};

export type NoteFull = {
  id: string;
  projectId: string;
  title: string;
  contentJson: string;
  plainText: string;
  createdAt: string;
  updatedAt: string;
};

export const PROJECT_EMOJIS = [
  "📖", "📔", "📓", "✒️", "🌙", "⭐", "🌹", "🌿",
  "☕", "🎯", "💡", "❤️", "🔥", "🌊", "🏔️", "🎓",
] as const;

export const PROJECT_COLORS = [
  "#F5C044", // amarillo sol
  "#C9A227", // gold
  "#E08A3C", // ámbar
  "#C96F4A", // terracota
  "#9CAF88", // salvia
  "#8FA9B5", // azul niebla
] as const;
