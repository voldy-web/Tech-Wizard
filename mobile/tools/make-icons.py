#!/usr/bin/env python3
"""
Builds every app icon / splash image from the original logo (assets/source/logo-original.webp).

  python tools/make-icons.py            (needs:  pip install pillow numpy)

The logo is neon artwork on a dark navy tile. Android masks icons (circle / squircle) and wants separate layers, so we:
  1. model the smooth navy background,
  2. recover the glowing artwork as a transparent layer ("un-blend" it from the background),
  3. write: icon.png, android-icon-foreground/background/monochrome.png, splash-icon.png, favicon.png, logo.png
"""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', 'assets')
SRC = os.path.join(ASSETS, 'source', 'logo-original.webp')

src = Image.open(SRC).convert('RGB')
W, H = src.size
a = np.asarray(src).astype(np.float64)

# ---- 1. model the smooth background inside the glass frame (quadratic fit per channel) -------------------------------
x0, x1, y0, y1 = 165, 860, 165, 865                       # region inside the frame ring
yy, xx = np.mgrid[y0:y1, x0:x1]
patch = a[y0:y1, x0:x1]
bg_like = patch.max(axis=2) < 70                           # dark pixels = background (art and stars are brighter)
u, v = (xx - 512.0) / 350.0, (yy - 512.0) / 350.0
def design(u, v):
    return np.stack([np.ones_like(u), u, v, u * v, u * u, v * v], axis=-1)
D = design(u, v)
coef = [np.linalg.lstsq(D[bg_like], patch[..., c][bg_like], rcond=None)[0] for c in range(3)]
def bg_model(xs, ys):
    uu, vv = (xs - 512.0) / 350.0, (ys - 512.0) / 350.0
    d = design(uu, vv)
    return np.clip(np.stack([d @ coef[c] for c in range(3)], axis=-1), 0, 255)

# ---- 2. recover the artwork as RGBA ------------------------------------------------------------------------------------
ART = (178, 178, 846, 846)                                 # square around the art (excludes the frame ring)
ax0, ay0, ax1, ay1 = ART
ys, xs = np.mgrid[ay0:ay1, ax0:ax1]
art_rgb = a[ay0:ay1, ax0:ax1]
B = bg_model(xs.astype(float), ys.astype(float))
bmax = B.max(axis=2)
mx = art_rgb.max(axis=2)
FLOOR = 34                                                 # ignore anything this close to the background (soft haze, star dust, banding)
alpha = np.clip((mx - bmax - FLOOR) / (255.0 - bmax - FLOOR), 0, 1)
alpha = np.where(alpha < 0.05, 0, alpha)
a3 = np.maximum(alpha[..., None], 1e-3)
color = np.clip((art_rgb - (1 - alpha[..., None]) * B) / a3, 0, 255)
art = np.dstack([color, alpha * 255]).astype(np.uint8)
art_img = Image.fromarray(art, 'RGBA')
art_img = art_img.crop(art_img.getbbox())                  # tight crop of the artwork
print('artwork size', art_img.size)

def place(canvas_size, scale_to_width, center=(0.5, 0.5)):
    """Return an RGBA canvas with the art centred; scale_to_width in px of the canvas."""
    s = scale_to_width / art_img.width
    resized = art_img.resize((round(art_img.width * s), round(art_img.height * s)), Image.LANCZOS)
    canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    canvas.alpha_composite(resized, (round(canvas_size * center[0] - resized.width / 2), round(canvas_size * center[1] - resized.height / 2)))
    return canvas

def background(size):
    ys2, xs2 = np.mgrid[0:size, 0:size].astype(float)
    # map the full canvas onto the logo's inner region so the gradient matches the original look
    mapped_x = x0 + xs2 / size * (x1 - x0)
    mapped_y = y0 + ys2 / size * (y1 - y0)
    return Image.fromarray(bg_model(mapped_x, mapped_y).astype(np.uint8), 'RGB').convert('RGBA')

# ---- 3. write the files ---------------------------------------------------------------------------------------------------
def save(img, name):
    path = os.path.join(ASSETS, name)
    img.save(path, optimize=True)
    print('wrote', name, img.size)

S = 1024
bg = background(S)
# Android adaptive icon: only the middle 66/108 of the canvas is guaranteed visible -> keep the art inside it
save(place(S, 560), 'android-icon-foreground.png')
save(bg.convert('RGB'), 'android-icon-background.png')
mono = place(S, 560)
alpha_only = np.asarray(mono)[..., 3].astype(np.float64)
alpha_only = np.clip(alpha_only * 1.35, 0, 255).astype(np.uint8)     # thin neon lines -> a bit bolder for the one-colour icon
mono_img = Image.fromarray(np.dstack([np.full_like(alpha_only, 255)] * 3 + [alpha_only]), 'RGBA')
save(mono_img, 'android-icon-monochrome.png')

# full-bleed square icon (older Android / iOS / web): background + art, no frame
full = bg.copy()
full.alpha_composite(place(S, 700))
save(full.convert('RGB'), 'icon.png')

# splash: art on transparent (the splash colour in app.json matches the navy)
save(place(S, 720), 'splash-icon.png')

save(full.convert('RGB').resize((96, 96), Image.LANCZOS), 'favicon.png')
# in-app logo (the original tile, small)
src.resize((256, 256), Image.LANCZOS).save(os.path.join(ASSETS, 'logo.png'), optimize=True)
print('wrote logo.png (256x256)')
mid = bg_model(np.array([[512.0]]), np.array([[512.0]]))[0, 0]
print('background centre colour: #%02X%02X%02X' % tuple(int(c) for c in mid))
