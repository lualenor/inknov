#!/usr/bin/env python3
"""
Genera el logo de Inknov: insignia circular dorada con libro abierto
(estilo de la imagen de referencia) + iconos PWA en public/icons/.
"""
from PIL import Image, ImageDraw, ImageFont
import math, os

OUT = "/home/z/my-project/public/icons"
os.makedirs(OUT, exist_ok=True)

GOLD_LIGHT = (240, 214, 138)
GOLD = (201, 162, 39)
GOLD_DARK = (140, 109, 31)
BLACK = (18, 14, 10)
CREAM = (244, 239, 227)

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"
S = 1024  # lienzo maestro


def quad_points(p0, p1, p2, n=40):
    """Puntos de una curva cuadrática p0→p2 con control p1."""
    pts = []
    for i in range(n + 1):
        t = i / n
        x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0]
        y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]
        pts.append((x, y))
    return pts


def draw_page(draw, cx, cy, side, top, bottom, spread):
    """Dibuja una página del libro abierto (side: -1 izquierda, +1 derecha)."""
    x0 = cx + side * 14
    x1 = cx + side * (14 + spread)
    top_edge = quad_points((x0, top), ((x0 + x1) / 2, top - 26), (x1, top - 12), 30)
    right_edge = [(x1, top - 12), (x1, bottom + 10)]
    bottom_edge = quad_points(
        (x1, bottom + 10), ((x0 + x1) / 2, bottom + 22), (x0, bottom), 30
    )
    spine = [(x0, bottom), (x0, top)]
    pts = top_edge + right_edge + bottom_edge + spine
    draw.polygon(pts, fill=GOLD_LIGHT, outline=GOLD_DARK, width=6)
    for k in range(1, 3):
        t = k / 3.2
        ya = top + (bottom - top) * t * 0.55
        yb = top + (bottom - top) * t * 0.9
        line = quad_points(
            (cx + side * 22, ya), (cx + side * (14 + spread * 0.55), ya - 14), (x1 - side * 8, yb), 20
        )
        draw.line(line, fill=GOLD, width=4)


def arc_text(target_img, text, cx, cy, radius, start_deg, end_deg, font, fill, stroke_fill, stroke_w=2):
    """Texto a lo largo del arco inferior del círculo (legible, tipo acuñado)."""
    layer = Image.new("RGBA", target_img.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    widths = []
    for ch in text:
        bbox = ld.textbbox((0, 0), ch, font=font)
        widths.append(max(1, bbox[2] - bbox[0]))
    total = sum(widths)
    arc_span = end_deg - start_deg
    acc = 0
    for i, ch in enumerate(text):
        center_angle = start_deg + arc_span * ((acc + widths[i] / 2) / total)
        acc += widths[i]
        a = math.radians(center_angle)
        x = cx + radius * math.cos(a)
        y = cy + radius * math.sin(a)
        rot = -(center_angle - 90)  # la parte superior de la letra mira al centro
        glyph = Image.new("RGBA", (260, 260), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glyph)
        gd.text((130, 130), ch, font=font, fill=fill, anchor="mm",
                stroke_width=stroke_w, stroke_fill=stroke_fill)
        glyph = glyph.rotate(rot, resample=Image.BICUBIC, center=(130, 130))
        layer.paste(glyph, (int(x - 130), int(y - 130)), glyph)
    target_img.alpha_composite(layer)


def make_icon(size, maskable=False, transparent=False):
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if transparent:
        d.ellipse([8, 8, S - 8, S - 8], fill=BLACK)
    else:
        d.rounded_rectangle([0, 0, S, S], radius=int(S * 0.22), fill=BLACK)

    cx = cy = S / 2

    # anillos dorados
    R = S * 0.455 if maskable else S * 0.44
    d.ellipse([cx - R, cy - R, cx + R, cy + R], outline=GOLD, width=int(S * 0.016))
    R2 = R - S * 0.028
    d.ellipse([cx - R2, cy - R2, cx + R2, cy + R2], outline=GOLD_DARK, width=int(S * 0.005))
    R3 = R2 - S * 0.012
    d.ellipse([cx - R3, cy - R3, cx + R3, cy + R3], outline=GOLD, width=int(S * 0.003))

    # libro abierto
    top = cy - S * 0.115
    bottom = cy + S * 0.075
    spread = S * 0.155
    draw_page(d, cx, cy, -1, top, bottom, spread)
    draw_page(d, cx, cy, +1, top, bottom, spread)
    d.line([(cx, top + S * 0.008), (cx, bottom - S * 0.004)], fill=GOLD_DARK, width=int(S * 0.008))
    base = quad_points(
        (cx - spread - 14, bottom + 16),
        (cx, bottom + S * 0.052),
        (cx + spread + 14, bottom + 16),
        40,
    )
    d.line(base, fill=GOLD, width=int(S * 0.009))

    # texto "Inknov" en arco inferior
    font = ImageFont.truetype(FONT, int(S * 0.095))
    arc_text(
        img, "Inknov", cx, cy,
        radius=S * 0.335,
        start_deg=152, end_deg=28,
        font=font,
        fill=GOLD_LIGHT,
        stroke_fill=GOLD_DARK,
        stroke_w=3,
    )

    # brillitos laterales
    for (sx, sy) in [(cx - S * 0.30, cy - S * 0.24), (cx + S * 0.30, cy - S * 0.24)]:
        r = S * 0.014
        d.ellipse([sx - r, sy - r, sx + r, sy + r], fill=GOLD_LIGHT)

    if size != S:
        img = img.resize((size, size), Image.LANCZOS)
    return img


def main():
    make_icon(512).save(f"{OUT}/icon-512.png")
    make_icon(192).save(f"{OUT}/icon-192.png")
    make_icon(512, maskable=True).save(f"{OUT}/icon-maskable-512.png")
    make_icon(180).save(f"{OUT}/apple-touch-icon.png")
    make_icon(64).save(f"{OUT}/favicon-32.png")
    make_icon(420, transparent=True).save("/home/z/my-project/public/inknov-badge.png")
    print("icons ok:", os.listdir(OUT))


if __name__ == "__main__":
    main()
