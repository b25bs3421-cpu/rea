"""
Flatten the studio backdrop of the preview artwork.

The hero samples particles from every pixel that differs from the flat colour
of the artwork's backdrop (`imageBackground`, or the four corners of the image
when that prop is omitted) and re-tints the crisp image with
`page background / image background`. A generated backdrop carries a soft
vignette, so the corners under-describe the middle of the frame and the hero
would grow a faint halo of stray particles.

The backdrop is estimated locally (normalised blur that ignores the sculpture)
and every backdrop pixel is pinned to the page colour. The sculpture keeps its
original values, so its contrast is untouched.

    python3 scripts/prepare-artwork.py public/sculpture-light.jpg "#EBE9E5"
"""

from __future__ import annotations

import sys

import numpy as np
from PIL import Image, ImageFilter

RADIUS = 40  # px of the local backdrop estimate
TOLERANCE = 0.045  # colour distance to the local backdrop that still reads as backdrop
FEATHER = 3  # px of soft transition around the sculpture
PASSES = 5


def box_blur_1d(a: np.ndarray, radius: int, axis: int) -> np.ndarray:
    pad = [(0, 0)] * a.ndim
    pad[axis] = (radius + 1, radius)
    cumulative = np.cumsum(np.pad(a, pad, mode="edge"), axis=axis, dtype=np.float64)
    lead = [slice(None)] * a.ndim
    tail = [slice(None)] * a.ndim
    lead[axis] = slice(2 * radius + 1, None)
    tail[axis] = slice(0, -(2 * radius + 1))
    return ((cumulative[tuple(lead)] - cumulative[tuple(tail)]) / (2 * radius + 1)).astype(
        np.float32
    )


def blur(channel: np.ndarray, radius: int) -> np.ndarray:
    return box_blur_1d(box_blur_1d(channel, radius, 0), radius, 1)


def local_backdrop(px: np.ndarray, free: np.ndarray) -> np.ndarray:
    """Normalised blur of the backdrop pixels: the smooth surface they lie on."""
    weight = free.astype(np.float32)
    total = np.maximum(blur(weight, RADIUS), 1e-4)
    out = np.empty_like(px)
    for channel in range(px.shape[2]):
        out[..., channel] = blur(px[..., channel] * weight, RADIUS) / total
    return out


def smoothstep(edge0: float, edge1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - edge0) / (edge1 - edge0), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def flatten(path: str, target_hex: str) -> None:
    img = Image.open(path).convert("RGB")
    px = np.asarray(img).astype(np.float32) / 255.0
    target = (
        np.array(
            [int(target_hex[i : i + 2], 16) for i in (1, 3, 5)], dtype=np.float32
        )
        / 255.0
    )

    # start from the four corners and grow the backdrop by local estimation
    border = np.concatenate(
        [px[:4].reshape(-1, 3), px[-4:].reshape(-1, 3), px[:, :4].reshape(-1, 3), px[:, -4:].reshape(-1, 3)]
    )
    free = np.linalg.norm(px - np.median(border, axis=0), axis=2) < 0.25
    backdrop = px.copy()
    for _ in range(PASSES):
        backdrop = local_backdrop(px, free)
        distance = np.linalg.norm(px - backdrop, axis=2)
        free = distance < TOLERANCE

    weight = smoothstep(TOLERANCE, TOLERANCE * 2.5, distance)  # 0 = backdrop, 1 = sculpture
    weight_image = Image.fromarray((weight * 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(FEATHER)
    )
    weight = np.asarray(weight_image, dtype=np.float32) / 255.0

    out = np.clip(px * weight[..., None] + target * (1.0 - weight[..., None]), 0.0, 1.0)
    Image.fromarray((out * 255 + 0.5).astype(np.uint8)).save(path, quality=92)

    h, w, _ = out.shape
    pw = max(2, round(w * 0.012))
    corners = np.mean(
        [
            out[:pw, :pw].reshape(-1, 3).mean(0),
            out[:pw, -pw:].reshape(-1, 3).mean(0),
            out[-pw:, :pw].reshape(-1, 3).mean(0),
            out[-pw:, -pw:].reshape(-1, 3).mean(0),
        ],
        axis=0,
    )
    material = np.linalg.norm(out - target, axis=2) > 0.03
    print(
        f"{path}: corners #{''.join(f'{int(round(c * 255)):02X}' for c in corners)} "
        f"-> {target_hex}, {float(material.mean()):.1%} of pixels read as sculpture"
    )


if __name__ == "__main__":
    flatten(sys.argv[1], sys.argv[2])
