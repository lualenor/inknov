import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  PageBreak,
  Paragraph,
  type ParagraphChild,
  TextRun,
} from "docx";
import { imageSize } from "image-size";
import { loadImageBytes } from "@/lib/storage";

/**
 * Exportación de Inknov a Microsoft Word (.docx).
 *
 * Convierte el documento JSON del editor (Tiptap / ProseMirror) en un
 * documento Word real:
 *   - Títulos (H1–H3), negrita, cursiva, subrayado, tachado y código
 *   - Listas con viñetas y numeradas (con niveles anidados)
 *   - Citas con barra dorada, líneas horizontales y saltos de línea
 *   - Imágenes JPG/PNG descargadas e INCRUSTADAS dentro del .docx
 */

type Mark = { type: string; attrs?: Record<string, unknown> };
type JsonNode = {
  type?: string;
  text?: string;
  marks?: Mark[];
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
};

const GOLD = "C9A227";
const INK = "26201A";
const GRAY = "8A8171";

/** Tamaño máximo de imagen dentro de la página (px a 96 dpi). */
const MAX_IMAGE_WIDTH = 460;
const MAX_IMAGE_HEIGHT = 560;

type ImageCache = Map<string, { data: Buffer; mimeType: string } | null>;

function safeParseJson(raw: string): JsonNode | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as JsonNode) : null;
  } catch {
    return null;
  }
}

function textRun(node: JsonNode): TextRun {
  const marks = new Set((node.marks ?? []).map((m) => m.type));
  return new TextRun({
    text: node.text ?? "",
    bold: marks.has("bold") || undefined,
    italics: marks.has("italic") || undefined,
    underline: marks.has("underline") ? {} : undefined,
    strike: marks.has("strike") || undefined,
    font: marks.has("code") ? "Courier New" : undefined,
    color: marks.has("code") ? "9A6B12" : undefined,
  });
}

async function imageRunFromSrc(
  src: unknown,
  userId: string,
  cache: ImageCache
): Promise<ImageRun | null> {
  if (typeof src !== "string" || !src) return null;
  if (!cache.has(src)) cache.set(src, await loadImageBytes(src, userId));
  const img = cache.get(src);
  if (!img) return null;

  let width = 0;
  let height = 0;
  try {
    const dims = imageSize(img.data);
    width = dims.width ?? 0;
    height = dims.height ?? 0;
  } catch {
    return null;
  }
  if (!width || !height) return null;

  const scale = Math.min(1, MAX_IMAGE_WIDTH / width, MAX_IMAGE_HEIGHT / height);
  return new ImageRun({
    type: img.mimeType.includes("png") ? "png" : "jpg",
    data: img.data,
    transformation: {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
    },
  });
}

/** Hijos en línea de un párrafo: texto con formato, saltos e imágenes. */
async function inlineChildren(
  node: JsonNode,
  userId: string,
  cache: ImageCache
): Promise<ParagraphChild[]> {
  const children: ParagraphChild[] = [];
  for (const child of node.content ?? []) {
    switch (child.type) {
      case "image": {
        const run = await imageRunFromSrc(child.attrs?.src, userId, cache);
        if (run) children.push(run);
        break;
      }
      case "hardBreak":
        children.push(new TextRun({ break: 1 }));
        break;
      case "text":
        children.push(textRun(child));
        break;
      default:
        break;
    }
  }
  return children;
}

type BlockOptions = { listDepth: number; ordered: boolean; quote: boolean };
const DEFAULT_BLOCK: BlockOptions = { listDepth: 0, ordered: false, quote: false };

const HEADING_MAP = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
} as const;

async function nodeToBlocks(
  node: JsonNode,
  userId: string,
  cache: ImageCache,
  opts: BlockOptions
): Promise<Paragraph[]> {
  switch (node.type) {
    case "paragraph": {
      const children = await inlineChildren(node, userId, cache);
      return [
        new Paragraph({
          children,
          ...(opts.quote
            ? {
                indent: { left: 340 },
                border: {
                  left: { style: BorderStyle.SINGLE, size: 18, color: GOLD, space: 12 },
                },
              }
            : {}),
        }),
      ];
    }

    case "heading": {
      const level = Math.min(3, Math.max(1, Number(node.attrs?.level) || 1));
      const children = await inlineChildren(node, userId, cache);
      return [new Paragraph({ children, heading: HEADING_MAP[level as 1 | 2 | 3] })];
    }

    case "bulletList":
    case "orderedList": {
      const ordered = node.type === "orderedList";
      const blocks: Paragraph[] = [];
      for (const item of node.content ?? []) {
        if (item.type !== "listItem") continue;
        for (const child of item.content ?? []) {
          if (child.type === "paragraph" || child.type === "heading") {
            const children = await inlineChildren(child, userId, cache);
            blocks.push(
              new Paragraph({
                children,
                ...(ordered
                  ? { numbering: { reference: "inknov-listas", level: Math.min(2, opts.listDepth) } }
                  : { bullet: { level: Math.min(2, opts.listDepth) } }),
              })
            );
          } else {
            // Listas anidadas
            blocks.push(
              ...(await nodeToBlocks(child, userId, cache, {
                listDepth: opts.listDepth + 1,
                ordered: child.type === "orderedList",
                quote: opts.quote,
              }))
            );
          }
        }
      }
      return blocks;
    }

    case "blockquote": {
      const blocks: Paragraph[] = [];
      for (const child of node.content ?? []) {
        blocks.push(
          ...(await nodeToBlocks(child, userId, cache, { ...opts, quote: true }))
        );
      }
      return blocks;
    }

    case "codeBlock": {
      const text =
        (node.content ?? [])
          .map((c) => c.text ?? "")
          .join("\n") || "";
      return text.split("\n").map(
        (line) =>
          new Paragraph({
            children: [new TextRun({ text: line, font: "Courier New", color: INK })],
            shading: { fill: "F6F1E4" },
            spacing: { before: 40, after: 40 },
          })
      );
    }

    case "horizontalRule":
      return [
        new Paragraph({
          children: [new TextRun({ text: "" })],
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: GOLD, space: 8 },
          },
          spacing: { before: 160, after: 160 },
        }),
      ];

    case "image": {
      // Imagen como nodo de bloque independiente
      const run = await imageRunFromSrc(node.attrs?.src, userId, cache);
      return run
        ? [new Paragraph({ children: [run], alignment: AlignmentType.CENTER })]
        : [];
    }

    case "hardBreak":
    case "text":
      return [];

    default: {
      // Nodo desconocido: intentar renderizar su contenido
      const blocks: Paragraph[] = [];
      for (const child of node.content ?? []) {
        blocks.push(...(await nodeToBlocks(child, userId, cache, opts)));
      }
      return blocks;
    }
  }
}

export type ExportNote = {
  title: string;
  contentJson: string;
  plainText?: string;
};

/** Bloques de una nota: título + contenido + pie discreto. */
async function noteBlocks(note: ExportNote, userId: string, cache: ImageCache): Promise<Paragraph[]> {
  const blocks: Paragraph[] = [];
  blocks.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: note.title || "Sin título" })],
    })
  );

  const json = safeParseJson(note.contentJson);
  if (json) {
    blocks.push(...(await nodeToBlocks(json, userId, cache, DEFAULT_BLOCK)));
  } else if (note.plainText) {
    blocks.push(new Paragraph(note.plainText));
  }

  blocks.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Exportado con Inknov · tu espacio privado de escritura",
          size: 16,
          color: GRAY,
          italics: true,
        }),
      ],
      spacing: { before: 480 },
    })
  );
  return blocks;
}

const DOC_STYLES = {
  default: {
    document: {
      run: { font: "Georgia", size: 22, color: INK },
      paragraph: { spacing: { line: 320, after: 160 } },
    },
    heading1: {
      run: { font: "Georgia", size: 40, bold: true, color: INK },
      paragraph: { spacing: { before: 320, after: 200 } },
    },
    heading2: {
      run: { font: "Georgia", size: 30, bold: true, color: INK },
      paragraph: { spacing: { before: 280, after: 160 } },
    },
    heading3: {
      run: { font: "Georgia", size: 25, bold: true, color: INK },
      paragraph: { spacing: { before: 240, after: 140 } },
    },
  },
} as const;

const NUMBERING_CONFIG = {
  config: [
    {
      reference: "inknov-listas",
      levels: [0, 1, 2].map((level) => ({
        level,
        format: LevelFormat.DECIMAL,
        text: `%${level + 1}.`,
        alignment: AlignmentType.START,
        style: { paragraph: { indent: { left: 720 + level * 360, hanging: 360 } } },
      })),
    },
  ],
} as const;

function newDocument(children: Paragraph[]): Document {
  return new Document({
    styles: DOC_STYLES,
    numbering: NUMBERING_CONFIG,
    sections: [
      {
        properties: {
          page: { margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } },
        },
        children,
      },
    ],
  });
}

/** Exporta UNA nota a .docx (Buffer). */
export async function exportNoteDocx(
  note: ExportNote,
  userId: string
): Promise<Buffer> {
  const cache: ImageCache = new Map();
  const children = await noteBlocks(note, userId, cache);
  const doc = newDocument(children);
  return Packer.toBuffer(doc);
}

export type ExportProject = {
  name: string;
  description?: string | null;
};

/** Exporta un PROYECTO completo a .docx (portada + notas separadas por página). */
export async function exportProjectDocx(
  project: ExportProject,
  notes: ExportNote[],
  userId: string
): Promise<Buffer> {
  const cache: ImageCache = new Map();
  const children: Paragraph[] = [];

  // ── Portada ──────────────────────────────────────────────
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "Inknov",
          font: "Georgia",
          size: 24,
          bold: true,
          color: GOLD,
          characterSpacing: 60,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 3600, after: 120 },
    })
  );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: project.name, bold: true, size: 56 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
    })
  );
  if (project.description) {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: project.description, italics: true, color: GRAY })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
      })
    );
  }
  const fecha = new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(new Date());
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `${notes.length} ${notes.length === 1 ? "nota" : "notas"} · ${fecha}`,
          size: 20,
          color: GRAY,
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  );

  // ── Notas ────────────────────────────────────────────────
  for (let i = 0; i < notes.length; i++) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    children.push(...(await noteBlocks(notes[i], userId, cache)));
  }

  const doc = newDocument(children);
  return Packer.toBuffer(doc);
}

/** Convierte un nombre en nombre de archivo seguro: "Mi Libro ✨" → "mi-libro.docx" */
export function slugifyDocxName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${base || "inknov"}.docx`;
}

/** Respuesta HTTP con el .docx como descarga. */
export function docxResponse(buffer: Buffer, displayName: string): Response {
  const safeName = slugifyDocxName(displayName);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(
        `${displayName.replace(/["\\]/g, "")}.docx`
      )}`,
      "Cache-Control": "no-store",
    },
  });
}
