"""Generates the social preview image and the touch icon for the Sudoku site.

Run from the repository root:  python3 tools/make-assets.py
Requires Pillow and the Noto CJK fonts.
"""
import os

from PIL import Image, ImageDraw, ImageFont, ImageFilter

BOLD = "/usr/share/fonts/TTF/DejaVuSans-Bold.ttf"
REGULAR = "/usr/share/fonts/noto/NotoSans-Regular.ttf"
CJK = "/usr/share/fonts/noto-cjk/NotoSansCJK-Bold.ttc"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")

ACCENT = (92, 124, 255)
ACCENT_DARK = (42, 78, 222)
TEXT = (240, 243, 252)
MUTED = (154, 165, 194)


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(size, top, bottom):
    width, height = size
    img = Image.new("RGB", size)
    draw = ImageDraw.Draw(img)
    for y in range(height):
        draw.line([(0, y), (width, y)], fill=lerp(top, bottom, y / max(1, height - 1)))
    return img


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

    fnt = font(BOLD, int(step * 0.62))
    if digits:
        for row, values in enumerate(digits):
            for col, value in enumerate(values):
                if not value:
                    continue
                color = digit_color if givens and givens[row][col] else (150, 170, 255)
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
    img = gradient((1200, 630), (24, 28, 44), (10, 12, 20))
    draw = ImageDraw.Draw(img)

    # Accent glow behind the board.
    glow = Image.new("RGB", (1200, 630), (10, 12, 20))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([640, 60, 1240, 620], fill=(30, 44, 96))
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    img = Image.blend(img, glow, 0.55)
    draw = ImageDraw.Draw(img)

    title_font = font(BOLD, 92)
    subtitle_font = font(REGULAR, 34)
    badge_font = font(BOLD, 30)
    credit_font = font(REGULAR, 26)

    draw.text((80, 150), "Sudoku", font=title_font, fill=TEXT)
    draw.rounded_rectangle([82, 76, 176, 132], radius=16, fill=ACCENT)
    glyph_font = font(CJK, 40)
    glyph = "\u6570"
    gbox = draw.textbbox((0, 0), glyph, font=glyph_font)
    gx = 82 + (94 - (gbox[2] - gbox[0])) / 2 - gbox[0]
    gy = 76 + (56 - (gbox[3] - gbox[1])) / 2 - gbox[1]
    draw.text((gx, gy), glyph, font=glyph_font, fill=(255, 255, 255))

    for index, line in enumerate(
        ["Play online for free.", "4 difficulty levels \u00b7 notes \u00b7 hints", "timer \u00b7 statistics \u00b7 2 languages"]
    ):
        draw.text((84, 274 + index * 46), line, font=subtitle_font, fill=MUTED)

    draw.rounded_rectangle([84, 424, 268, 478], radius=27, fill=ACCENT_DARK)
    draw.text((112, 434), "No sign-up", font=badge_font, fill=(255, 255, 255))

    draw_board(
        img,
        (700, 105, 1130, 535),
        digits=PUZZLE,
        givens=GIVENS,
        line=(58, 66, 96),
        thick=(120, 138, 190),
        digit_color=(238, 242, 255),
    )
    draw.rounded_rectangle([696, 101, 1134, 539], radius=18, outline=(120, 138, 190), width=4)
    draw.text((84, 550), "sudoku-game.ddnsfree.com", font=credit_font, fill=(110, 122, 156))

    img.save(f"{OUT}/og-image.png", optimize=True)
    print("wrote og-image.png")


def make_touch_icon():
    size = 180
    img = Image.new("RGB", (size, size), ACCENT)
    draw = ImageDraw.Draw(img)
    for y in range(size):
        draw.line([(0, y), (size, y)], fill=lerp(ACCENT, ACCENT_DARK, y / (size - 1)))
    margin = 40
    step = (size - 2 * margin) / 3
    for i in range(4):
        width = 7 if i % 3 == 0 else 3
        pos = round(margin + step * i)
        draw.line([(pos, margin), (pos, size - margin)], fill=(255, 255, 255), width=width)
        pos = round(margin + step * i)
        draw.line([(margin, pos), (size - margin, pos)], fill=(255, 255, 255), width=width)
    draw.ellipse([size / 2 - 9, size / 2 - 9, size / 2 + 9, size / 2 + 9], fill=(255, 255, 255))
    img.save(f"{OUT}/apple-touch-icon.png", optimize=True)
    print("wrote apple-touch-icon.png")


if __name__ == "__main__":
    make_og_image()
    make_touch_icon()
