"""
figures.py

Extracts the PNG figures embedded in the two executed notebooks into
backend/static/figures/ so the frontend can display the *actual* notebook
output, and splits the K-Means 3 x 3 map composite (Cell 6) into one image per
observation date for the date-by-date map gallery.

Nothing is re-plotted or re-coloured here: every pixel served comes straight
from the notebooks' saved outputs. The per-date crops are taken from inside
each panel's black axes frame, which is located automatically.

Run directly to (re)generate the files:  python figures.py
"""

import io
import os
from typing import Dict, List, Tuple

import numpy as np
from PIL import Image

from notebook_io import cell_pngs, load_notebook

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BACKEND_DIR, "static")
FIG_DIR = os.path.join(STATIC_DIR, "figures")
STATIC_URL = "/static/figures"

KMEANS_NB = "KMeans_Sentinel2.ipynb"
MARKOV_NB = "Shako_Sentinel2_Markov.ipynb"

# (notebook, cell marker, output index within that cell) -> output file name.
# Markers are unique strings from each cell's source, so the mapping survives
# cells being re-ordered or re-executed.
FIGURE_SPECS = {
    "u3": [
        (KMEANS_NB, "CELL 2 — SCALE FEATURES", 0, "kmeans_k_selection.png",
         "Elbow, silhouette and Davies–Bouldin for k = 2–8 (red dashed line: chosen k = 3)"),
        (KMEANS_NB, "CELL 4 — COMPARE K-MEANS", 0, "kmeans_confusion_vs_reference.png",
         "K-means vs reference confusion matrix, all dates"),
        (KMEANS_NB, "CELL 6 — PLOTS", 0, "kmeans_maps_shako.png",
         "K-means maps for all nine dates (KMeans_maps_Shako.png)"),
        (KMEANS_NB, "CELL 6 — PLOTS", 1, "kmeans_agreement.png",
         "Agreement of K-means with the reference labels and the Decision Tree maps"),
    ],
    "u4": [
        (MARKOV_NB, "MARKOV CHAIN – CELL 1", 0, "markov_class_area.png",
         "Class area through time (Decision Tree, Sentinel-2)"),
        (MARKOV_NB, "MARKOV CHAIN – CELL 1", 1, "markov_transition_matrices_by_period.png",
         "Transition probabilities between consecutive dates"),
        (MARKOV_NB, "MARKOV CHAIN – CELL 1", 2, "markov_change_matrix_gain_loss.png",
         "Change matrix (km²) and gains, losses and net change, 14 Nov → 24 Dec"),
        (MARKOV_NB, "MARKOV CHAIN – CELL 2", 0, "markov_persistence_by_period.png",
         "Persistence probability per period (dashed = whole-series value)"),
        (MARKOV_NB, "MARKOV CHAIN – CELL 2", 1, "markov_hindcast_forecast.png",
         "Classified vs modelled area: hindcast and 6-step forecast"),
        (MARKOV_NB, "MARKOV CHAIN – CELL 2", 2, "markov_matrix_validation.png",
         "Markov transition matrix and validation on the last date"),
        (MARKOV_NB, "MARKOV CHAIN – CELL 3", 0, "markov_change_map.png",
         "Change map, 14 Nov → 24 Dec 2025 (Decision Tree maps)"),
    ],
}


def _write_if_changed(path: str, data: bytes) -> None:
    if os.path.exists(path):
        with open(path, "rb") as fh:
            if fh.read() == data:
                return
    with open(path, "wb") as fh:
        fh.write(data)


def _line_groups(indices: np.ndarray) -> List[Tuple[int, int]]:
    """Group consecutive integer indices into (first, last) runs."""
    groups = []
    for idx in indices:
        if groups and idx == groups[-1][1] + 1:
            groups[-1][1] = idx
        else:
            groups.append([idx, idx])
    return [tuple(g) for g in groups]


def _axes_boxes(img: Image.Image, n_rows: int, n_cols: int, min_frac: float = 0.6) -> List[Tuple[int, int, int, int]]:
    """
    Locate each subplot's black axes frame in a matplotlib grid figure.
    Spines are pure black lines spanning most of a panel; map pixels never are.
    Returns boxes (left, top, right, bottom) inside the frames, row-major.
    """
    gray = np.asarray(img.convert("L"), dtype=np.int16)
    dark = gray < 25
    h, w = gray.shape
    min_run_h = int(min_frac * w / n_cols)
    min_run_v = int(min_frac * h / n_rows)

    rows = _line_groups(np.where(dark.sum(axis=1) >= min_run_h)[0])
    cols = _line_groups(np.where(dark.sum(axis=0) >= min_run_v)[0])
    if len(rows) != 2 * n_rows or len(cols) != 2 * n_cols:
        raise ValueError(
            f"Expected {2 * n_rows} horizontal and {2 * n_cols} vertical spines, "
            f"found {len(rows)} and {len(cols)}"
        )
    boxes = []
    for r in range(n_rows):
        top, bottom = rows[2 * r][1] + 1, rows[2 * r + 1][0]
        for c in range(n_cols):
            left, right = cols[2 * c][1] + 1, cols[2 * c + 1][0]
            boxes.append((left, top, right, bottom))
    return boxes


def _split_kmeans_maps(png: bytes, dates: List[str], out_dir: str) -> List[str]:
    img = Image.open(io.BytesIO(png)).convert("RGBA")
    flat = Image.new("RGB", img.size, (255, 255, 255))
    flat.paste(img, mask=img.split()[-1])
    cols = 3
    rows = int(np.ceil(len(dates) / cols))
    boxes = _axes_boxes(flat, rows, cols)
    names = []
    for date, box in zip(dates, boxes):
        name = f"kmeans_map_{date}.png"
        buf = io.BytesIO()
        flat.crop(box).save(buf, format="PNG", optimize=True)
        _write_if_changed(os.path.join(out_dir, name), buf.getvalue())
        names.append(name)
    return names


def _crop_single_axes(png: bytes, out_dir: str, name: str):
    """Crop the inside of a single-axes figure's frame (e.g. the change map)."""
    img = Image.open(io.BytesIO(png)).convert("RGBA")
    flat = Image.new("RGB", img.size, (255, 255, 255))
    flat.paste(img, mask=img.split()[-1])
    try:
        box = _axes_boxes(flat, 1, 1, min_frac=0.5)[0]
    except ValueError:
        return None
    buf = io.BytesIO()
    flat.crop(box).save(buf, format="PNG", optimize=True)
    _write_if_changed(os.path.join(out_dir, name), buf.getvalue())
    return name


def ensure_figures(kmeans_dates: List[str]) -> Dict[str, dict]:
    """
    Write every embedded figure (and the per-date K-Means map crops) into
    static/figures/ and return a registry of URL paths + captions, keyed by
    file name. Safe to call on every startup; unchanged files are not rewritten.
    """
    registry: Dict[str, dict] = {}
    for group, specs in FIGURE_SPECS.items():
        out_dir = os.path.join(FIG_DIR, group)
        os.makedirs(out_dir, exist_ok=True)
        for nb_name, marker, index, filename, caption in specs:
            pngs = cell_pngs(load_notebook(nb_name), marker)
            if index >= len(pngs):
                continue  # figure missing from this notebook run - skip, never invent
            _write_if_changed(os.path.join(out_dir, filename), pngs[index])
            registry[filename] = {
                "url": f"{STATIC_URL}/{group}/{filename}",
                "caption": caption,
                "source": f"{nb_name} · output of cell “{marker}”",
            }

    change_png = cell_pngs(load_notebook(MARKOV_NB), "MARKOV CHAIN – CELL 3")
    if change_png:
        name = _crop_single_axes(change_png[0], os.path.join(FIG_DIR, "u4"), "markov_change_map_crop.png")
        if name:
            registry[name] = {
                "url": f"{STATIC_URL}/u4/{name}",
                "caption": "Map area cropped from the notebook's change map (Cell 3)",
                "source": f"{MARKOV_NB} · output of cell “MARKOV CHAIN – CELL 3”",
            }

    maps_png = cell_pngs(load_notebook(KMEANS_NB), "CELL 6 — PLOTS")
    if maps_png:
        for name in _split_kmeans_maps(maps_png[0], kmeans_dates, os.path.join(FIG_DIR, "u3")):
            registry[name] = {
                "url": f"{STATIC_URL}/u3/{name}",
                "caption": "Map panel cropped from KMeans_maps_Shako.png",
                "source": f"{KMEANS_NB} · output of cell “CELL 6 — PLOTS”",
            }
    return registry


if __name__ == "__main__":
    from kmeans_results import parse_kmeans_notebook

    raw = parse_kmeans_notebook()
    reg = ensure_figures([d["date"] for d in raw["points_per_date"]])
    for name, info in reg.items():
        print(f"{info['url']:<70} {info['caption']}")
