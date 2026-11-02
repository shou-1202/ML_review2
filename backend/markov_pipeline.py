"""
markov_pipeline.py  (U4 rerun)

The processing of Shako_Sentinel2_Markov.ipynb Cells 1-3, ported to functions:
read the classified maps, compute exact per-pixel areas, count class-to-class
transitions between consecutive dates, pool them into P, validate on the last
date, forecast N_FUTURE steps, find the steady state, and build the
first-to-last change matrix.

It only runs when the classified Decision Tree GeoTIFFs are present in
backend/data/inputs/markov/  (classified_Sentinel2_<date>.tif - the files the
notebook reads from "Data/Shako/Data sample/Sentinel2/Sample Levels/Spectral/
models/output"). They are not embedded in the notebook, so by default the site
shows the executed notebook's saved outputs. Requires `rasterio`.

A rerun computes the per-interval matrices (and pixel counts) exactly, so the
figure transcription in data/u4_period_transition_matrices.json is not used.
"""

import ast
import glob
import os
import re

import numpy as np

from markov_results import NOTEBOOK, MARK_C1, MARK_C2, MARK_C3
from notebook_io import cell_source, load_notebook, notebook_assignment

INPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "inputs", "markov")


class MissingInputs(FileNotFoundError):
    pass


def _extract_date(name):
    m = re.search(r"\d{4}-\d{2}-\d{2}", name)
    return m.group(0) if m else None


def _map_files(input_dir):
    return sorted((f for f in glob.glob(os.path.join(input_dir, "*.tif"))
                   if _extract_date(os.path.basename(f))),
                  key=lambda f: _extract_date(os.path.basename(f)))


def input_status() -> dict:
    files = _map_files(INPUT_DIR)
    return {
        "available": len(files) >= 3,
        "input_dir": "backend/data/inputs/markov/",
        "expected": "classified_Sentinel2_<YYYY-MM-DD>.tif — the 9 Decision Tree classified maps "
                    "(codes 1 Glacier, 2 Glacial Lake, 3 Non-Glacier Land, 0 no data); needs rasterio",
        "found_files": len(files),
    }


def class_map_previews(input_dir: str = INPUT_DIR) -> dict:
    """
    If the classified GeoTIFFs are present, render each one to a PNG preview
    (notebook class colours, black = no data) so the U4 page can show the
    actual input map for every date. Returns {date: url}; empty when the maps
    (or rasterio) are not available - nothing is ever drawn without them.
    """
    files = _map_files(input_dir)
    if not files:
        return {}
    try:
        import rasterio
        from PIL import Image
    except ImportError:
        return {}
    from figures import FIG_DIR, STATIC_URL

    nb = load_notebook(NOTEBOOK)
    colors = ast.literal_eval(notebook_assignment(cell_source(nb, MARK_C1), "COLORS"))
    lut = np.zeros((256, 3), dtype=np.uint8)
    for code, hex_color in colors.items():
        lut[int(code)] = [int(hex_color[i:i + 2], 16) for i in (1, 3, 5)]

    out_dir = os.path.join(FIG_DIR, "u4", "classified")
    os.makedirs(out_dir, exist_ok=True)
    urls = {}
    for f in files:
        date = _extract_date(os.path.basename(f))
        name = f"dt_map_{date}.png"
        out = os.path.join(out_dir, name)
        if not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(f):
            with rasterio.open(f) as src:
                arr = src.read(1)
            Image.fromarray(lut[np.clip(arr, 0, 255).astype(np.uint8)]).save(out, optimize=True)
        urls[date] = f"{STATIC_URL}/u4/classified/{name}"
    return urls


def run_markov_pipeline(input_dir: str = INPUT_DIR) -> dict:
    files = _map_files(input_dir)
    if len(files) < 3:
        raise MissingInputs(
            "Rerunning U4 requires the classified Decision Tree GeoTIFFs, which are not included "
            f"with the notebook. Place {input_status()['expected']} in backend/data/inputs/markov/."
        )
    try:
        import rasterio
    except ImportError as exc:
        raise MissingInputs("Rerunning U4 needs the 'rasterio' package (pip install rasterio).") from exc

    nb = load_notebook(NOTEBOOK)
    src1, src2 = cell_source(nb, MARK_C1), cell_source(nb, MARK_C2)
    CLASSES = ast.literal_eval(notebook_assignment(src1, "CLASSES"))
    COLORS = ast.literal_eval(notebook_assignment(src1, "COLORS"))
    N_FUTURE = int(notebook_assignment(src2, "N_FUTURE"))
    MODEL = ast.literal_eval(notebook_assignment(src1, "MODEL"))
    codes = list(CLASSES)
    names = [CLASSES[c] for c in codes]
    K = len(codes)

    # ---- Cell 1: read maps ----
    dates = [_extract_date(os.path.basename(f)) for f in files]
    stack = []
    for f in files:
        with rasterio.open(f) as src:
            stack.append(src.read(1))
            transform, crs = src.transform, src.crs
    stack = np.stack(stack)
    T, H, W = stack.shape
    d64 = np.array(dates, dtype="datetime64[D]")
    STEP = int(np.median(np.diff(d64).astype(int)))
    valid = np.all(np.isin(stack, codes), axis=0)

    if crs is not None and crs.is_geographic:
        R = 6371008.8
        lat_edges = transform.f + transform.e * np.arange(H + 1)
        row_area = (R ** 2) * np.radians(abs(transform.a)) * np.abs(
            np.sin(np.radians(lat_edges[:-1])) - np.sin(np.radians(lat_edges[1:])))
        pix_km2 = np.repeat(row_area[:, None] / 1e6, W, axis=1)
    else:
        pix_km2 = np.full((H, W), abs(transform.a * transform.e) / 1e6)

    area = np.array([[pix_km2[valid & (stack[t] == c)].sum() for c in codes] for t in range(T)])
    share = area / area.sum(axis=1, keepdims=True)

    def transition_counts(a, b):
        m = np.zeros((K, K))
        for i, ci in enumerate(codes):
            for j, cj in enumerate(codes):
                m[i, j] = np.sum(valid & (a == ci) & (b == cj))
        return m

    def to_prob(m):
        s = m.sum(axis=1, keepdims=True)
        return np.divide(m, s, out=np.zeros_like(m), where=s > 0)

    pair_counts = [transition_counts(stack[t], stack[t + 1]) for t in range(T - 1)]
    cross = np.array([[pix_km2[valid & (stack[0] == ci) & (stack[-1] == cj)].sum() for cj in codes]
                      for ci in codes])

    # ---- Cell 2: model, validation, forecast ----
    P = to_prob(sum(pair_counts))
    P_train = to_prob(sum(pair_counts[:-1]))
    pred = share[-2] @ P_train
    tot_last = area.sum(axis=1)[-1]
    val_rows = []
    for k, n in enumerate(names):
        a, p = share[-1][k] * tot_last, pred[k] * tot_last
        val_rows.append({"class": n, "actual_km2": float(a), "predicted_km2": float(p),
                         "error_km2": float(p - a), "error_pct": float(100 * (p - a) / a) if a else None})
    fut = [share[-1]]
    for _ in range(N_FUTURE):
        fut.append(fut[-1] @ P)
    fut_dates = [str(d64[-1] + np.timedelta64(STEP * (i + 1), "D")) for i in range(N_FUTURE)]
    w, v = np.linalg.eig(P.T)
    ss = np.real(v[:, np.argmin(np.abs(w - 1))])
    ss = ss / ss.sum()

    # ---- Cell 3: changed area ----
    changed = pix_km2[valid & (stack[0] != stack[-1])].sum()

    return {
        "settings": {
            "site": ast.literal_eval(notebook_assignment(src1, "SITE")),
            "sensor": ast.literal_eval(notebook_assignment(src1, "SENSOR")),
            "model": MODEL, "model_title": MODEL.replace("_", " ").title(),
            "n_future": N_FUTURE, "step_days": STEP,
            "class_codes": {str(k): v for k, v in CLASSES.items()},
            "class_colors": {CLASSES[k]: v for k, v in COLORS.items()},
        },
        "class_names": names,
        "grid": {"rows": H, "cols": W, "valid_pixels": int(valid.sum()), "total_pixels": int(H * W),
                 "pixel_size_m": float(np.sqrt(pix_km2.mean()) * 1000)},
        "area": [{"date": d, "values": area[t].tolist()} for t, d in enumerate(dates)],
        "periods": [{"from": dates[t], "to": dates[t + 1], "P": to_prob(m).tolist(),
                     "counts": m.astype(int).tolist()} for t, m in enumerate(pair_counts)],
        "periods_source": "computed",
        "P": P.tolist(),
        "validation": {"predict_date": dates[-1], "from_date": dates[-2], "rows": val_rows,
                       "total_abs_error_pct": float(100 * np.abs(pred - share[-1]).sum() / 2)},
        "forecast": [{"date": d, "values": (fut[i + 1] * tot_last).tolist()} for i, d in enumerate(fut_dates)],
        "steady_state": [{"class": n, "share_pct": float(100 * s), "km2": float(s * tot_last)}
                         for n, s in zip(names, ss)],
        "change_matrix_km2": cross.tolist(),
        "changed_area": {"km2": float(changed), "pct": float(100 * changed / pix_km2[valid].sum())},
        "change_map_colors": {
            "unchanged": {int(k): v for k, v in ast.literal_eval(notebook_assignment(cell_source(nb, MARK_C3), "pale")).items()},
            "changed": {int(k): v for k, v in ast.literal_eval(notebook_assignment(cell_source(nb, MARK_C3), "change_colors")).items()},
        },
    }
