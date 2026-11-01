<div align="center">

# 📖 Inknov

**Tu refugio privado para escribir, estudiar y crear.**

PWA de código abierto para escritura y gestión de proyectos creativos:
organiza carpetas/proyectos, escribe con un editor enriquecido, adjunta
fotos que te inspiran y **exporta todo a Microsoft Word (.docx) con las
imágenes incrustadas** — todo privado por usuario e instalable en el
celular desde el navegador.

*Paleta cálida crema & gold · Insignia de libro dorado · 100 % open source (MIT)*

</div>

---

## ✨ Características

| # | Función | Cómo funciona |
|---|---------|---------------|
| 1 | **Cuentas y privacidad por usuario** | Registro e inicio de sesión con correo + contraseña (bcrypt). Cada usuario ve **únicamente** sus proyectos: toda consulta filtra por `userId` en el servidor. |
| 2 | **Proyectos / carpetas** | Crea, edita y elimina tantas carpetas como quieras («Diario personal», «Poemas», «Libro nuevo»…) con emoji y color propios. |
| 3 | **Editor enriquecido** | Títulos, negrita, cursiva, subrayado, tachado, listas, citas, separadores. Autoguardado con debounce e indicador «Guardado». |
| 4 | **Imágenes desde el celular** | Sube fotos **JPG/PNG** (botón 🖼️ o pegando). Escribe al lado o debajo de la imagen: la foto de una rosa junto a tu poema. |
| 5 | **Exportación a Word (.docx)** | Descarga una nota o un **proyecto completo** (portada + notas separadas por página) con formato, títulos, listas, citas e **imágenes incrustadas dentro del .docx**. |
| 6 | **PWA instalable** | `manifest` + service worker: «Instalar app» / «Agregar a la pantalla de inicio» y úsala a pantalla completa como app nativa. |

## 🧰 Stack tecnológico

- **Next.js 16 (App Router)** + **TypeScript** — frontend y API en un solo proyecto, listo para Vercel.
- **Tailwind CSS 4** + shadcn/ui — interfaz cálida, minimalista y táctil.
- **Prisma ORM** — **PostgreSQL** (compatible con **Neon**) en producción; incluye `schema.sqlite.prisma` para desarrollo local sin servidor.
- **Tiptap** — editor de texto enriquecido (ProseMirror) con imágenes inline.
- **`docx`** — generación real de documentos Word con imágenes incrustadas.
- **@vercel/blob** — almacenamiento de imágenes (con *fallback* automático a la base de datos para cero configuración).
- **bcryptjs + jose** — contraseñas hasheadas y sesiones JWT en cookie `httpOnly`.
- **Framer Motion** — transiciones suaves.

## 📁 Estructura del proyecto

```text
inknov/
├── prisma/
│   ├── schema.prisma            # Esquema de BD (PostgreSQL/Neon por defecto)
│   ├── schema.sqlite.prisma     # Alternativa para desarrollo local sin servidor
│   └── schema.postgres.prisma   # Copia del esquema de producción
├── public/
│   ├── icons/                   # Iconos PWA (192/512/maskable/apple/favicon)
│   ├── inknov-badge.png         # Insignia del logo
│   ├── sw.js                    # Service worker (caché del app shell)
│   └── robots.txt
├── scripts/
│   └── make_logo.py             # Regenera el logo y los iconos (Python + PIL)
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Metadatos, viewport, PWA (theme color, iOS)
│   │   ├── manifest.ts          # Manifiesto PWA (instalable)
│   │   ├── page.tsx             # Shell de la SPA
│   │   ├── globals.css          # Paleta crema/gold + estilos del editor
│   │   └── api/
│   │       ├── auth/register/   # POST crear cuenta
│   │       ├── auth/login/      # POST iniciar sesión
│   │       ├── auth/logout/     # POST cerrar sesión
│   │       ├── me/              # GET usuario actual
│   │       ├── projects/        # GET listar · POST crear
│   │       ├── projects/[id]/   # GET/PATCH/DELETE (proyecto propio)
│   │       │   ├── notes/       # POST crear nota
│   │       │   └── export/      # GET proyecto completo → .docx
│   │       ├── notes/[id]/      # GET/PATCH/DELETE (nota propia)
│   │       │   ├── images/      # POST subir imagen (JPG/PNG)
│   │       │   └── export/      # GET nota → .docx
│   │       └── images/[id]/     # GET bytes de imagen (solo el dueño)
│   ├── components/
│   │   ├── ui/                  # Componentes shadcn/ui
│   │   └── inknov/
│   │       ├── app.tsx          # Router hash + sesión + guardas de ruta
│   │       ├── landing.tsx      # Página pública
│   │       ├── auth.tsx         # Login / registro
│   │       ├── dashboard.tsx    # Saludo + grid de proyectos
│   │       ├── project-view.tsx # Notas del proyecto
│   │       ├── editor.tsx       # Editor Tiptap + autoguardado + subir imágenes
│   │       ├── shared.tsx       # Cabecera, diálogos, utilidades
│   │       └── logo.tsx         # Insignia dorada en SVG
│   ├── hooks/                   # use-toast, use-mobile
│   └── lib/
│       ├── auth.ts              # bcrypt + JWT en cookie httpOnly
│       ├── db.ts                # Cliente Prisma (singleton)
│       ├── docx.ts              # Tiptap JSON → Word (.docx) con imágenes
│       └── storage.ts           # Vercel Blob ⇄ base de datos
├── .env.example
├── LICENSE (MIT)
└── README.md
```

## 🗃️ Modelo de datos

```
User 1─n Project 1─n Note 1─n ImageAsset
  └────────────┴────────────┘   (siempre con userId: aislamiento total)
```

| Modelo | Campos clave | Notas |
|--------|--------------|-------|
| `User` | `email` (único), `name`, `passwordHash` | La contraseña nunca se guarda en claro (bcrypt, 10 rondas). |
| `Project` | `name`, `description`, `icon`, `color` | Carpeta/proyecto. Al eliminarse borra sus notas (cascade). |
| `Note` | `title`, `contentJson`, `plainText` | `contentJson` = documento Tiptap; `plainText` alimenta los extractos. |
| `ImageAsset` | `mimeType`, `size`, `width/height`, `storage`, `data` o `blobUrl` | `storage="db"` guarda los bytes en la BD; `storage="blob"` usa Vercel Blob. |

## 🚀 Puesta en marcha local

Requisitos: **Node.js 20+** (o Bun) y… ¡eso es todo!

```bash
# 1. Instalar dependencias
npm install          # o: bun install

# 2. Variables de entorno
cp .env.example .env

# 3a. Modo rápido SIN servidor de BD (SQLite)
cp prisma/schema.sqlite.prisma prisma/schema.prisma
#    y en .env:  DATABASE_URL="file:./db/dev.db"
npx prisma db push

# 3b. Modo PostgreSQL (Neon o Docker) — recomendado para producción
#    deja prisma/schema.prisma con provider "postgresql"
#    y en .env tu cadena de conexión
npx prisma db push

# 4. Arrancar
npm run dev          # http://localhost:3000
```

> 💡 Sin configurar nada más, las imágenes se guardan dentro de la base de
> datos y se sirven por `/api/images/[id]`. Si más adelante añades
> `BLOB_READ_WRITE_TOKEN`, las imágenes nuevas irán a Vercel Blob
> automáticamente.

## ☁️ Despliegue gratuito (Neon + Vercel + Blob)

### Paso 1 — Base de datos PostgreSQL gratis en Neon

1. Crea cuenta en [neon.com](https://neon.com) (plan free).
2. Crea un proyecto llamado `inknov`.
3. Copia la **cadena de conexión pooled** (tiene `-pooler`), algo así:
   `postgresql://usuario:pass@ep-xxx-pooler.region.aws.neon.tech/inknov?sslmode=require`

### Paso 2 — Almacenamiento de imágenes (opcional, gratis)

1. En tu dashboard de Vercel → pestaña **Storage** → **Create Database → Blob**.
2. Conéctalo a tu proyecto: Vercel añadirá `BLOB_READ_WRITE_TOKEN` solo.
3. Si prefieres no usarlo, omite este paso: las imágenes vivirán en Neon.

### Paso 3 — Subir Inknov a Vercel

1. Sube el proyecto a un repositorio de GitHub.
2. En [vercel.com](https://vercel.com) → **Add New → Project** → importa el repo
   (plan Hobby, gratuito; Vercel detecta Next.js automáticamente).
3. En **Environment Variables** añade:

   | Variable | Valor |
   |----------|-------|
   | `DATABASE_URL` | tu cadena **pooled** de Neon |
   | `DIRECT_URL` | tu cadena **direct** de Neon (sin `-pooler`) |
   | `JWT_SECRET` | un secreto largo y aleatorio (`openssl rand -base64 32`) |
   | `BLOB_READ_WRITE_TOKEN` | (opcional) lo añade Vercel si conectaste Blob |

4. **Deploy**. Después abre una terminal local conectada al proyecto
   (`npx vercel login`, `npx vercel link`) y crea las tablas:

   ```bash
   npx prisma db push     # crea User, Project, Note, ImageAsset en Neon
   ```

5. ¡Listo! Abre `https://tu-proyecto.vercel.app`, crea tu cuenta y
   **tus textos ya son tuyos y solo tuyos**.

### ¿Docker / servidor propio?

```bash
npm run build && npm start   # BUILD_STANDALONE=1 ya viene en el script build
```

## 📲 Instalar la app en el celular (PWA)

1. Abre la URL de tu Inknov en Chrome (Android) o Safari (iPhone).
2. **Android**: menú ⋮ → *Instalar aplicación* · **iPhone**: Compartir →
   *Agregar a la pantalla de inicio*.
3. Se abrirá a pantalla completa, con icono propio, como cualquier app.

El service worker guarda el *shell* de la app: si pierdes la conexión,
la interfaz sigue abierta y tus datos se sincronizan al volver.

## 🔐 Privacidad y seguridad

- Sesiones en cookie **httpOnly + SameSite=Lax** (inaccesible para JS).
- Contraseñas con **bcrypt**; los tokens JWT se firman con `JWT_SECRET`.
- **Aislamiento estricto**: cada consulta API filtra por `userId`;
  acceder a recursos ajenos responde `404` (no revela su existencia).
- Las imágenes solo las sirve su dueño (`/api/images/[id]` verifica sesión).
- Validación de entradas con **zod** en todas las rutas.

## 🧪 Scripts

| Comando | Qué hace |
|---------|----------|
| `npm run dev` | Desarrollo en `http://localhost:3000` |
| `npm run build` / `npm start` | Build de producción / servidor |
| `npm run lint` | ESLint |
| `npm run db:push` | Sincroniza el esquema con la base de datos |
| `npm run db:generate` | Regenera el cliente Prisma |

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Abre un *issue* o envía un *pull
request* con tu mejora (más formatos de exportación, modo oscuro,
exportación a PDF…).

## 📄 Licencia

[MIT](./LICENSE) — úsalo, modifícalo y compártelo libremente.

---

<div align="center">

*Hecho con 🌹 y tinta dorada — Inknov*

</div>
