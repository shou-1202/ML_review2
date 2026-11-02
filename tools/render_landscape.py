"""
render_landscape.py

Procedural render of a high-Himalayan glacier lake at blue hour, used as the
hero art of the website. It is an illustration, not a photograph of Shako Cho:
no real terrain data is involved. To use a real photograph instead, put it at
frontend/public/images/hero-photo.jpg (see README).

Method: a fractal "ridged" heightfield is shaped into a valley with a lake,
shaded (snow by altitude and slope, low sun, ambient light), then drawn with a
column-wise height-field renderer (front-to-back, running-minimum y-buffer).
The lake reflection is a second render from the camera mirrored in the water
plane. Depth fog and a blue-hour sky finish the image.

  python tools/render_landscape.py            # writes frontend/public/images/
"""

import os
import sys

import numpy as np
from PIL import Image, ImageFilter

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "public", "images")
rng = np.random.default_rng(7)

N = 1024                     # heightfield size (world units)
WATER = 0.0                  # water level


def smooth_noise(size, cells, rng):
    """Bicubic-upsampled random grid: smooth value noise in [-1, 1]."""
    g = rng.random((cells + 3, cells + 3)).astype(np.float32)
    img = Image.fromarray(g).resize((size + size // cells * 3, size + size // cells * 3), Image.BICUBIC)
    a = np.asarray(img)[size // cells: size // cells + size, size // cells: size // cells + size]
    return (a - a.mean()) / (a.std() + 1e-9)


def ridged_fbm(size, rng, octaves=8, base=4):
    h = np.zeros((size, size), np.float32)
    amp, weight = 1.0, np.ones((size, size), np.float32)
    total = 0.0
    for o in range(octaves):
        n = smooth_noise(size, base * 2 ** o, rng)
        r = 1.0 - np.abs(np.tanh(n * 0.9))           # ridges where noise crosses 0
        r = r ** 2
        r *= np.clip(weight, 0, 1)
        weight = r * 1.6
        h += r * amp
        total += amp
        amp *= 0.5
    return h / total


def build_terrain():
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32) / N   # yy = distance from camera (0 near, 1 far)
    ridges = ridged_fbm(N, rng)
    soft = smooth_noise(N, 6, rng) * 0.5 + smooth_noise(N, 13, rng) * 0.25

    # valley along the view axis that bends slightly; lake basin in the middle distance
    centre = 0.5 + 0.06 * np.sin(yy * 3.2 + 0.6)
    lateral = np.abs(xx - centre)
    valley = np.clip((lateral - 0.06) / 0.30, 0, 1) ** 1.5           # 0 on the floor, 1 on the walls
    distance = np.clip((yy - 0.38) / 0.55, 0, 1)                      # far massif rises at the back
    massif = distance ** 1.3

    detail = ridged_fbm(N, rng, octaves=6, base=24)
    relief = (0.22 + 0.78 * ridges ** 1.15 + 0.08 * detail) * (0.55 * valley + 1.0 * massif) + 0.06 * soft
    floor = 0.03 + 0.02 * np.abs(smooth_noise(N, 20, rng)) * (1 - valley)
    h = np.maximum(relief, 0) * 260.0 + floor * 40

    # glacial lake basin (oval) in the middle distance, slightly left
    lx, ly = centre - 0.02, 0.24
    d = ((xx - lx) / 0.15) ** 2 + ((yy - ly) / 0.075) ** 2
    basin = np.clip(1.15 - d, 0, 1)
    h = h * (1 - basin ** 0.6) - 3.0 * basin
    # moraine lip around the lake
    h += 6.0 * np.exp(-((np.sqrt(d) - 1.05) ** 2) / 0.01) * (1 - massif)
    # foreground slopes rising on both sides
    near = np.clip(1 - yy / 0.13, 0, 1)
    h += near ** 2 * (20 + 60 * ridges) * np.clip(lateral / 0.45, 0.05, 1) ** 1.5
    from scipy.ndimage import gaussian_filter
    h = gaussian_filter(h.astype(np.float32), 0.9)
    return h.astype(np.float32), ridges


def shade(h, ridges):
    gy, gx = np.gradient(h)
    raw_slope = 1 - 1 / np.sqrt(gx ** 2 + gy ** 2 + 1)          # true slope, for snow
    gx, gy = gx * 1.8, gy * 1.8                                   # exaggerated, for light
    nz = 1 / np.sqrt(gx ** 2 + gy ** 2 + 1)
    nx, ny = -gx * nz, -gy * nz

    sun = np.array([-0.78, 0.25, 0.42]); sun /= np.linalg.norm(sun)          # low sun from the left
    lam = np.clip(nx * sun[0] + ny * sun[1] + nz * sun[2], 0, 1)
    sky_light = 0.6 + 0.4 * nz

    hn = h / h.max()
    snow_line = 0.11 + 0.035 * smooth_noise(N, 24, rng)
    snow = np.clip((hn - snow_line) / 0.06, 0, 1) * np.clip((0.50 - raw_slope) / 0.16, 0, 1)
    snow = np.clip(snow, 0, 1)
    grit = smooth_noise(N, 160, rng)

    rock = np.stack([0.22 + 0.06 * ridges + 0.04 * grit,
                     0.22 + 0.06 * ridges + 0.04 * grit,
                     0.26 + 0.07 * ridges + 0.045 * grit], -1)
    low = np.clip(1 - hn / 0.06, 0, 1)[..., None]                 # valley floor: paler moraine
    rock = rock * (1 - 0.5 * low) + np.array([0.40, 0.40, 0.41]) * 0.5 * low
    snow_col = np.array([0.88, 0.93, 0.98])

    base = rock * (1 - snow[..., None]) + snow_col * snow[..., None]
    sunlit = np.array([1.05, 0.78, 0.64])          # warm alpenglow
    shadow = np.array([0.42, 0.55, 0.74])          # cool blue-hour shadow
    light = lam[..., None] ** 1.5 * sunlit * (0.65 + 0.75 * snow[..., None]) + sky_light[..., None] * shadow * 0.72
    col = base * light
    # valley mist: low ground fades toward pale glacier blue
    mist = np.exp(-np.maximum(h, 0) / 14.0)[..., None] * 0.28
    col = col * (1 - mist) + np.array([0.58, 0.70, 0.80]) * mist
    return np.clip(col, 0, 1.4).astype(np.float32)


def render(h, col, W, H, cam_h, horizon, focal, cam_x, cam_y, zmax=1500, steps=6000, clip_below=None):
    """Column-wise height-field render. Returns colour image, depth image and water mask."""
    angles = np.arctan((np.arange(W) - W / 2) / focal)
    zs1 = np.geomspace(4.0, zmax, steps).astype(np.float32)
    # per-column jitter inside one depth step dithers slice banding into grain
    ratio = (zmax / 4.0) ** (1 / steps)
    jit = np.random.default_rng(3).random(W).astype(np.float32)
    zgrid = zs1[:, None] * (ratio ** jit)[None, :]
    px = cam_x + zgrid * np.tan(angles)[None, :]
    py = cam_y + zgrid
    inside = (px >= 0) & (px < N - 1) & (py >= 0) & (py < N - 1)
    ix = np.clip(px, 0, N - 1.001); iy = np.clip(py, 0, N - 1.001)
    x0 = ix.astype(int); y0 = iy.astype(int); fx = ix - x0; fy = iy - y0

    def bilerp(a):
        a00 = a[y0, x0]; a01 = a[y0, x0 + 1]; a10 = a[y0 + 1, x0]; a11 = a[y0 + 1, x0 + 1]
        if a.ndim == 3:
            fx_, fy_ = fx[..., None], fy[..., None]
        else:
            fx_, fy_ = fx, fy
        return (a00 * (1 - fx_) + a01 * fx_) * (1 - fy_) + (a10 * (1 - fx_) + a11 * fx_) * fy_

    hs = bilerp(h)
    water = hs < WATER
    if clip_below is not None:
        hs = np.where(water, -1e6, hs)          # reflection pass: ignore the water surface itself
    else:
        hs = np.maximum(hs, WATER)
    cs = bilerp(col)
    hs = np.where(inside, hs, -1e6)
    ys = horizon - (hs - cam_h) * focal / zgrid
    m = np.minimum.accumulate(ys, axis=0)

    img = np.zeros((H, W, 3), np.float32)
    depth = np.full((H, W), np.inf, np.float32)
    wmask = np.zeros((H, W), bool)
    rows = np.arange(H, dtype=np.float32)
    for c in range(W):
        idx = np.searchsorted(-m[:, c], -rows, side="left")
        hit = idx < steps
        k = np.where(hit, idx, 0)
        img[:, c] = np.where(hit[:, None], cs[k, c], 0)
        depth[:, c] = np.where(hit, zgrid[k, c], np.inf)
        wmask[:, c] = hit & water[k, c]
    return img, depth, wmask


def sky(W, H, horizon):
    y = np.arange(H, dtype=np.float32)[:, None] / H
    t = np.clip(y / (horizon / H), 0, 1)
    top = np.array([0.027, 0.082, 0.133])            # #071522 midnight
    mid = np.array([0.110, 0.230, 0.360])
    low = np.array([0.66, 0.82, 0.92])               # pale glacier blue
    glow = np.array([1.00, 0.62, 0.52])              # faint coral glow at the horizon
    col = np.where(t[..., None] < 0.6,
                   top + (mid - top) * (t[..., None] / 0.6),
                   mid + (low - mid) * np.clip((t[..., None] - 0.6) / 0.4, 0, 1) ** 1.3)
    x = np.arange(W, dtype=np.float32)[None, :] / W
    g = np.exp(-((x - 0.20) ** 2) / 0.09) * np.clip((t - 0.62) / 0.38, 0, 1) ** 1.6
    col = col * (1 - 0.42 * g[..., None]) + glow * 0.42 * g[..., None]
    stars = (rng.random((H, W)) > 0.99965) * np.clip(1 - t / 0.55, 0, 1) * rng.random((H, W))
    col = col + stars[..., None] * 0.55
    # thin high cloud bands
    cl = np.asarray(Image.fromarray((rng.random((9, 5)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)) / 255.0
    band = np.clip((cl - 0.5) / 0.5, 0, 1) * np.clip(1 - np.abs(t - 0.62) / 0.25, 0, 1)
    col = col + band[..., None] * 0.10 * np.array([0.9, 0.95, 1.0])
    return np.broadcast_to(col, (H, W, 3)).astype(np.float32).copy()


def main(variant="lake", W=2560, H=1440):
    h, ridges = build_terrain()
    col = shade(h, ridges)

    if variant == "aerial":                      # high oblique, satellite-like view (U4 hero)
        cam_x, cam_y, cam_h = N * 0.47, -60.0, 300.0
        horizon = H * 0.16
        focal = (W / 2) / np.tan(np.radians(70) / 2)
    else:                                        # lakeside view (home hero)
        cam_x, cam_y, cam_h = N * 0.50, 2.0, 60.0
        horizon = H * 0.40
        focal = (W / 2) / np.tan(np.radians(64) / 2)

    img, depth, water = render(h, col, W, H, cam_h, horizon, focal, cam_x, cam_y)
    refl, rdepth, _ = render(h, col, W, H, 2 * WATER - cam_h, horizon, focal, cam_x, cam_y, clip_below=True)
    refl = refl[::-1]                                  # mirror about the horizon row
    shift = int(round(2 * horizon - H))
    refl = np.roll(refl, shift, axis=0); rdepth = np.roll(rdepth[::-1], shift, axis=0)

    sk = sky(W, H, horizon)
    fog_col = np.array([0.42, 0.56, 0.68])
    fog = 0.85 * (1 - np.exp(-np.where(np.isfinite(depth), depth, 1e9) / 2600.0))
    scene = np.where(np.isfinite(depth)[..., None], img * (1 - fog[..., None]) + fog_col * fog[..., None], sk)

    # water: mirrored scene (or sky) + fresnel + ripples
    sk_m = sk[::-1]; sk_m = np.roll(sk_m, shift, axis=0)
    rfog = 0.85 * (1 - np.exp(-np.where(np.isfinite(rdepth), rdepth, 1e9) / 2600.0))
    rscene = np.where(np.isfinite(rdepth)[..., None], refl * (1 - rfog[..., None]) + fog_col * rfog[..., None], sk_m)
    ripple = np.asarray(Image.fromarray((rng.random((H // 6, W // 40)) * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC)) / 255.0
    rows = np.arange(H)[:, None]
    dist = np.clip((rows - horizon) / (H - horizon), 0, 1)
    jitter = ((ripple - 0.5) * 8 * (0.3 + dist)).astype(int)
    xs = np.clip(np.arange(W)[None, :] + jitter, 0, W - 1)
    rscene = rscene[rows, xs]
    tint = np.array([0.03, 0.10, 0.17])
    fres = 0.45 + 0.45 * (1 - dist) ** 2
    wcol = rscene * fres[..., None] + tint * (1 - fres[..., None])
    wcol += (ripple[..., None] - 0.5) * 0.05
    scene = np.where(water[..., None], wcol, scene)

    # grade: lift shadows toward navy, gentle contrast, vignette
    navy = np.array([0.04, 0.10, 0.17])
    lum = scene.mean(-1, keepdims=True)
    scene = scene + (navy - scene) * 0.18 * (1 - lum)
    yy, xx = np.mgrid[0:H, 0:W]
    vig = 1 - 0.28 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    scene = scene * vig[..., None]
    scene = np.clip(scene, 0, 1) ** (1 / 1.05)

    out = (scene * 255).astype(np.uint8)
    os.makedirs(OUT, exist_ok=True)
    im = Image.fromarray(out).filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2))
    name = "hero-landscape" if variant == "lake" else "hero-aerial"
    im.save(os.path.join(OUT, f"{name}.jpg"), quality=82, optimize=True, progressive=True)
    im.resize((1440, 810), Image.LANCZOS).save(os.path.join(OUT, f"{name}-1440.jpg"), quality=82, optimize=True, progressive=True)
    print("wrote", OUT)


if __name__ == "__main__":
    for v in ("lake", "aerial"):
        rng = np.random.default_rng(7)          # same terrain for both views
        main(v)
