#!/bin/bash
# Empaqueta Inknov como proyecto open source descargable (ZIP).
set -e

SRC=/home/z/my-project
STAGE=/tmp/inknov-package
ROOT="$STAGE/inknov"
ZIP=/home/z/my-project/download/inknov-open-source.zip

rm -rf "$STAGE"
mkdir -p "$ROOT"

# ── Copiar archivos del proyecto (sin artefactos del sandbox) ──
rsync -a \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.git' \
  --exclude '.zscripts' \
  --exclude 'agent-ctx' \
  --exclude 'db' \
  --exclude 'dev.log' \
  --exclude 'server.log' \
  --exclude '.env' \
  --exclude 'Caddyfile' \
  --exclude 'examples' \
  --exclude 'mini-services' \
  --exclude 'tests' \
  --exclude 'skills' \
  --exclude 'upload' \
  --exclude 'download' \
  --exclude 'prisma/schema.sqlite.prisma' \
  "$SRC/" "$ROOT/"

# ── Esquemas: producción = PostgreSQL por defecto ──
cp "$SRC/prisma/schema.postgres.prisma" "$ROOT/prisma/schema.prisma"
cp "$SRC/prisma/schema.prisma"          "$ROOT/prisma/schema.sqlite.prisma"

# ── Comprimir ──
mkdir -p /home/z/my-project/download
rm -f "$ZIP"
cd "$STAGE" && zip -r -q -9 "$ZIP" inknov

echo "== ZIP creado =="
ls -lh "$ZIP"
echo "== Contenido (primeros niveles) =="
unzip -l "$ZIP" | head -40
