"""Generates the social preview image and the touch icon for the Sudoku site.

Run from the repository root:  python3 tools/make-assets.py
Requires Pillow and the Noto / Liberation fonts.

The palette mirrors the "paper & ink" design system in src/styles/main.css -
flat warm paper, ink type, printed hairlines. No gradients, no glow.
"""
import os

from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")

# Fonts: a book serif for the masthead (matches --font-display) and a neutral
# sans for everything else (matches --font-sans).
SERIF_BOLD = "/usr/share/fonts/liberation/LiberationSerif-Bold.ttf"
SANS_BOLD = "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf"
SANS_REGULAR = "/usr/share/fonts/noto/NotoSans-Regular.ttf"
CJK_BOLD = "/usr/share/fonts/noto-cjk/NotoSerifCJK-Bold.ttc"

# Light theme tokens (see main.css).
PAPER = (244, 239, 228)  # --bg
PAPER_ELEVATED = (255, 253, 248)  # --bg-elevated
INK = (28, 26, 20)  # --text
INK_MUTED = (87, 80, 63)  # --text-muted
INK_SOFT = (138, 128, 101)  # --text-soft
LINE = (232, 225, 209)  # --line
LINE_STRONG = (179, 169, 143)  # --line-strong
BORDER = (221, 211, 189)  # --border
BORDER_STRONG = (194, 182, 155)  # --border-strong
ACCENT = (47, 77, 143)  # --accent
ACCENT_STRONG = (35, 59, 112)  # --accent-strong
GIVEN = (27, 26, 20)  # --given
USER = (43, 74, 147)  # --user


def font(path, size):
    return ImageFont.truetype(path, size)


def draw_board(img, box, digits=None, line=None, thick=None, digit_color=None, givens=None):
    """Draws a 9x9 board into the given bounding box."""
    draw = ImageDraw.Draw(img)
    x0, y0, x1, y1 = box
    size = x1 - x0
    step = size / 9
    for i in range(10):
        width = 4 if i % 3 == 0 else 1
        color = thick if i % 3 == 0 else line
        pos = round(x0 + step * i)
        draw.line([(pos, y0), (pos, y1)], fill=color, width=width)
        pos = round(y0 + step * i)
        draw.line([(x0, pos), (x1, pos)], fill=color, width=width)

    fnt = font(SANS_BOLD, int(step * 0.62))
    if digits:
        for row, values in enumerate(digits):
            for col, value in enumerate(values):
                if not value:
                    continue
                color = digit_color if givens and givens[row][col] else USER
                text = str(value)
                cx = x0 + step * col + step / 2
                cy = y0 + step * row + step / 2
                bbox = draw.textbbox((0, 0), text, font=fnt)
                draw.text(
                    (cx - (bbox[2] - bbox[0]) / 2, cy - (bbox[3] - bbox[1]) / 2 - bbox[1]),
                    text,
                    font=fnt,
                    fill=color,
                )


PUZZLE = [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9],
]
GIVENS = [[value != 0 for value in row] for row in PUZZLE]


def make_og_image():
    img = Image.new("RGB", (1200, 630), PAPER)
    draw = ImageDraw.Draw(img)

    # A printed sheet: one hairline frame, no card, no shadow.
    draw.rectangle([0, 0, 1199, 629], outline=BORDER, width=2)

    title_font = font(SERIF_BOLD, 100)
    subtitle_font = font(SANS_REGULAR, 34)
    badge_font = font(SANS_BOLD, 30)
    credit_font = font(SANS_REGULAR, 26)

    draw.text((80, 150), "Sudoku", font=title_font, fill=INK)
    draw.rounded_rectangle([82, 76, 176, 132], radius=10, fill=ACCENT)
    glyph_font = font(CJK_BOLD, 40)
    glyph = "\u6570"
    gbox = draw.textbbox((0, 0), glyph, font=glyph_font)
    gx = 82 + (94 - (gbox[2] - gbox[0])) / 2 - gbox[0]
    gy = 76 + (56 - (gbox[3] - gbox[1])) / 2 - gbox[1]
    draw.text((gx, gy), glyph, font=glyph_font, fill=PAPER)

    for index, line in enumerate(
        [
            "Play online for free.",
            "4 difficulty levels \u00b7 notes \u00b7 hints",
            "undo \u00b7 light/dark \u00b7 2 languages",
        ]
    ):
        color = INK_MUTED if index == 0 else INK_SOFT
        draw.text((84, 274 + index * 46), line, font=subtitle_font, fill=color)

    # The badge is sized from its own text so the label can never spill out.
    badge = "No sign-up"
    bbox = draw.textbbox((0, 0), badge, font=badge_font)
    text_w, text_h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    pad_x, badge_h = 28, 54
    draw.rounded_rectangle(
        [84, 424, 84 + text_w + 2 * pad_x, 424 + badge_h], radius=6, fill=ACCENT_STRONG
    )
    draw.text(
        (84 + pad_x - bbox[0], 424 + (badge_h - text_h) / 2 - bbox[1]),
        badge,
        font=badge_font,
        fill=PAPER,
    )

    draw_board(
        img,
        (700, 105, 1130, 535),
        digits=PUZZLE,
        givens=GIVENS,
        line=LINE,
        thick=LINE_STRONG,
        digit_color=GIVEN,
    )
    draw.rounded_rectangle([696, 101, 1134, 539], radius=8, outline=BORDER_STRONG, width=4)
    draw.text((84, 550), "sudoku-game.ddnsfree.com", font=credit_font, fill=INK_SOFT)

    img.save(f"{OUT}/og-image.png", optimize=True)
    print("wrote og-image.png")


def make_touch_icon():
    """The same printed board as `favicon.svg`, rasterised for the home screen."""
    size = 180
    img = Image.new("RGB", (size, size), PAPER)
    draw = ImageDraw.Draw(img)
    margin = 30
    span = size - 2 * margin
    step = span / 9
    draw.rectangle([margin, margin, size - margin, size - margin], fill=PAPER_ELEVATED)

    for i in range(1, 9):
        pos = round(margin + step * i)
        width = 4 if i % 3 == 0 else 2
        color = INK if i % 3 == 0 else LINE_STRONG
        draw.line([(pos, margin), (pos, size - margin)], fill=color, width=width)
        draw.line([(margin, pos), (size - margin, pos)], fill=color, width=width)

    draw.rectangle([margin, margin, size - margin, size - margin], outline=INK, width=6)
    img.save(f"{OUT}/apple-touch-icon.png", optimize=True)
    print("wrote apple-touch-icon.png")


if __name__ == "__main__":
    make_og_image()
    make_touch_icon()
