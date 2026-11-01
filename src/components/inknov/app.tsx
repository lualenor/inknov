"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { LogoBadge } from "@/components/inknov/logo";
import { LandingView } from "@/components/inknov/landing";
import { AuthView } from "@/components/inknov/auth";
import { DashboardView } from "@/components/inknov/dashboard";
import { ProjectView } from "@/components/inknov/project-view";
import { EditorView } from "@/components/inknov/editor";
import type { SessionUser } from "@/components/inknov/types";

/**
 * Inknov es una SPA (app shell): una sola página que cambia de vista
 * mediante rutas hash (#/app, #/app/p/…, #/app/p/…/n/…). Esto la hace
 * ideal como PWA: el service worker guarda el shell y la navegación
 * sigue funcionando sin conexión.
 */
type Route =
  | { name: "landing" }
  | { name: "login" }
  | { name: "register" }
  | { name: "dashboard" }
  | { name: "project"; projectId: string }
  | { name: "editor"; projectId: string; noteId: string };

function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, "");
  if (!h || h === "/") return { name: "landing" };
  const parts = h.split("/").filter(Boolean);
  if (parts[0] === "login") return { name: "login" };
  if (parts[0] === "register") return { name: "register" };
  if (parts[0] === "app") {
    if (parts[1] === "p" && parts[2] && parts[3] === "n" && parts[4]) {
      return { name: "editor", projectId: parts[2], noteId: parts[4] };
    }
    if (parts[1] === "p" && parts[2]) {
      return { name: "project", projectId: parts[2] };
    }
    return { name: "dashboard" };
  }
  return { name: "landing" };
}

export function navigate(to: string) {
  if (typeof window !== "undefined") window.location.hash = to;
}

/* El hash es un "sistema externo": React lo lee con useSyncExternalStore. */
function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
let cachedHash = "";
let cachedRoute: Route = { name: "landing" };
function getRouteSnapshot(): Route {
  const h = window.location.hash;
  if (h !== cachedHash) {
    cachedHash = h;
    cachedRoute = parseHash(h);
  }
  return cachedRoute;
}
const SERVER_ROUTE: Route = { name: "landing" };
function getServerRoute(): Route {
  return SERVER_ROUTE;
}

export function InkNovApp() {
  const [booted, setBooted] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);
  const route = useSyncExternalStore(
    subscribeHash,
    getRouteSnapshot,
    getServerRoute
  );

  // Arranque: preguntamos la sesión al servidor
  useEffect(() => {
    let alive = true;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (alive && data?.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => alive && setBooted(true));
    return () => {
      alive = false;
    };
  }, []);

  // Guardas de ruta amables
  useEffect(() => {
    if (!booted) return;
    const needsAuth =
      route.name === "dashboard" || route.name === "project" || route.name === "editor";
    if (needsAuth && !user) {
      navigate("#/login");
    } else if (
      (route.name === "landing" || route.name === "login" || route.name === "register") &&
      user
    ) {
      navigate("#/app");
    }
  }, [booted, route, user]);

  const handleLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* igualmente cerramos la sesión local */
    }
    setUser(null);
    navigate("#/");
  }, []);

  if (!booted) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <LogoBadge size={96} />
        </motion.div>
        <p className="text-sm text-muted-foreground tracking-wide">Inknov</p>
      </main>
    );
  }

  return (
    <motion.div
      key={route.name + ("projectId" in route ? route.projectId : "") + ("noteId" in route ? route.noteId : "")}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="min-h-screen bg-background"
    >
      {route.name === "landing" && <LandingView />}
      {(route.name === "login" || route.name === "register") && (
        <AuthView mode={route.name} onAuthed={setUser} />
      )}
      {route.name === "dashboard" && user && (
        <DashboardView user={user} onLogout={handleLogout} />
      )}
      {route.name === "project" && user && (
        <ProjectView
          key={route.projectId}
          user={user}
          projectId={route.projectId}
          onLogout={handleLogout}
        />
      )}
      {route.name === "editor" && user && (
        <EditorView
          key={route.noteId}
          user={user}
          projectId={route.projectId}
          noteId={route.noteId}
          onLogout={handleLogout}
        />
      )}
    </motion.div>
  );
}
