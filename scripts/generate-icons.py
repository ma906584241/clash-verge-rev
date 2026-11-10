"""Regenerate the airplane icon family with Python 3 and Pillow."""

import io
import math
import struct
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "src-tauri" / "icons"
FRONTEND = ROOT / "src" / "assets" / "image"
SIZE = 2048
SCALE = SIZE / 512
ICO_SIZES = [(n, n) for n in (16, 24, 32, 48, 64, 256)]
PALETTES = {
    "common": ("#F77DB3", "#9082FF"),
    "sys": ("#FFAA27", "#FF507D"),
    "tun": ("#B4D719", "#00BA56"),
}


def cubic(start, control_a, control_b, end):
    return [
        tuple(
            (1 - t) ** 3 * start[k]
            + 3 * (1 - t) ** 2 * t * control_a[k]
            + 3 * (1 - t) * t**2 * control_b[k]
            + t**3 * end[k]
            for k in (0, 1)
        )
        for t in (i / 16 for i in range(1, 17))
    ]


PLANE = [(256, 56)]
PLANE += cubic((256, 56), (272, 56), (282, 76), (282, 96))
PLANE += [
    (282, 212), (424, 298), (424, 334), (282, 292),
    (282, 384), (324, 414), (324, 442), (256, 422),
    (188, 442), (188, 414), (230, 384), (230, 292),
    (88, 334), (88, 298), (230, 212), (230, 96),
]
PLANE += cubic((230, 96), (230, 76), (240, 56), (256, 56))
PLANE = [
    (256 + (x - y) / math.sqrt(2), 256 + (x + y - 512) / math.sqrt(2))
    for x, y in PLANE
]
PLANE_PATH = "M " + " L ".join(f"{x:.3f} {y:.3f}" for x, y in PLANE) + " Z"


def svg(fill, background=False, macos=False):
    content = ""
    if background:
        top, bottom = PALETTES["common"]
        content = (
            '<defs><linearGradient id="airplane-gradient" x1="0" y1="0" x2="0" y2="1">'
            f'<stop stop-color="{top}"/><stop offset="1" stop-color="{bottom}"/>'
            '</linearGradient></defs>\n'
            '<circle cx="256" cy="256" r="256" fill="url(#airplane-gradient)"/>\n'
        )
    path = f'<path d="{PLANE_PATH}" fill="{fill}"/>'
    if macos:
        path = f'<g transform="translate(60 60) scale(0.3515625)">{path}</g>'
    box = 300 if macos else 512
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{box}" height="{box}" '
        f'viewBox="0 0 {box} {box}">\n{content}{path}\n</svg>\n'
    )


def plane_mask(scale=1.0, offset=0):
    mask = Image.new("L", (SIZE, SIZE))
    points = [
        ((256 + (x - 256) * scale + offset) * SCALE,
         (256 + (y - 256) * scale + offset) * SCALE)
        for x, y in PLANE
    ]
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return mask


def rgb(value):
    return tuple(bytes.fromhex(value.lstrip("#")))


def color_icon(kind="common"):
    top, bottom = (rgb(c) for c in PALETTES[kind])
    gradient = Image.new("RGBA", (1, SIZE))
    gradient.putdata([
        tuple(round(a + (b - a) * y / (SIZE - 1)) for a, b in zip(top, bottom)) + (255,)
        for y in range(SIZE)
    ])
    result = gradient.resize((SIZE, SIZE))
    circle = Image.new("L", (SIZE, SIZE))
    ImageDraw.Draw(circle).ellipse((0, 0, SIZE - 1, SIZE - 1), fill=255)
    result.putalpha(circle)
    result.paste((255, 255, 255, 255), mask=plane_mask())
    return result


def mono_icon(letter=None):
    mask = plane_mask(1.14 if letter is None else 1.04, 0 if letter is None else -20)
    if letter:
        draw = ImageDraw.Draw(mask)
        center, radius = 402 * SCALE, 98 * SCALE
        draw.ellipse((center - radius - 12 * SCALE, center - radius - 12 * SCALE,
                      center + radius + 12 * SCALE, center + radius + 12 * SCALE), fill=0)
        draw.ellipse((center - radius, center - radius, center + radius, center + radius), fill=255)
        # The badge is a transparent cutout so macOS template tinting preserves it.
        fonts = (Path("C:/Windows/Fonts/arialbd.ttf"),
                 Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
                 Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"))
        font_path = next(path for path in fonts if path.is_file())
        font = ImageFont.truetype(str(font_path), round(176 * SCALE))
        draw.text((center, center), letter, fill=0, font=font, anchor="mm")
    result = Image.new("RGBA", (SIZE, SIZE), "white")
    result.putalpha(mask)
    return result


def resize(image, size):
    return image.resize((size, size), Image.Resampling.LANCZOS)


def save_ico(image, path):
    resize(image, 256).save(path, sizes=ICO_SIZES)


def save_icns(image, path):
    # Pillow's ICNS writer omits the existing 16px and 32px non-Retina resources.
    sizes = {
        b"icp4": 16, b"icp5": 32, b"ic07": 128, b"ic08": 256,
        b"ic09": 512, b"ic10": 1024, b"ic11": 32, b"ic12": 64,
        b"ic13": 256, b"ic14": 512,
    }
    streams = {}
    for size in set(sizes.values()):
        stream = io.BytesIO()
        resize(image, size).save(stream, format="PNG")
        streams[size] = stream.getvalue()
    chunks = [
        kind + struct.pack(">I", 8 + len(streams[size])) + streams[size]
        for kind, size in sizes.items()
    ]
    toc = b"TOC " + struct.pack(">I", 8 + 8 * len(chunks))
    toc += b"".join(chunk[:8] for chunk in chunks)
    body = toc + b"".join(chunks)
    path.write_bytes(b"icns" + struct.pack(">I", 8 + len(body)) + body)


def main():
    app = color_icon()
    png_sizes = {
        "icon.png": 512, "32x32.png": 32, "128x128.png": 128,
        "128x128@2x.png": 256, "StoreLogo.png": 50,
        **{f"Square{n}x{n}Logo.png": n for n in (30, 44, 71, 89, 107, 142, 150, 284, 310)},
    }
    for name, size in png_sizes.items():
        resize(app, size).save(ICONS / name)
    save_ico(app, ICONS / "icon.ico")
    save_ico(app, FRONTEND / "logo.ico")
    save_icns(app, ICONS / "icon.icns")
    (ICONS / "icon.svg").write_text(svg("#ffffff", background=True), encoding="utf-8")
    (FRONTEND / "icon_light.svg").write_text(svg("#000000"), encoding="utf-8")
    (FRONTEND / "icon_dark.svg").write_text(svg("#ffffff"), encoding="utf-8")

    for kind, suffix in (("common", ""), ("sys", "-sys"), ("tun", "-tun")):
        save_ico(color_icon(kind), ICONS / f"tray-icon{suffix}.ico")
        mono = mono_icon({"common": None, "sys": "S", "tun": "T"}[kind])
        save_ico(mono, ICONS / f"tray-icon{suffix}-mono.ico")
        if suffix:
            save_ico(mono, ICONS / f"tray-icon{suffix}-mono-new.ico")

    macos = ICONS / "craft-verge.icon"
    (macos / "Assets" / "CraftVergePlane.svg").write_text(svg("white", macos=True), encoding="utf-8")
    print(f"Regenerated airplane icons in {ICONS} and {FRONTEND}")


if __name__ == "__main__":
    main()
