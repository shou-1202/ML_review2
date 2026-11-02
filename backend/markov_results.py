"""
markov_results.py  (U4 - Markov chain change analysis)

1. parse_markov_notebook() reads the executed Shako_Sentinel2_Markov.ipynb and
   recovers what each cell printed: map grid, class area per date, the
   first-to-last change matrix, the pooled transition matrix P, validation
   table, forecast, steady state and changed area.

   The per-interval matrices are the one exception: the notebook only *draws*
   them. They are read from data/u4_period_transition_matrices.json (a cell-by-
   cell transcription of that figure) and verified on load - see
   check_period_matrices().

2. build_u4_response(raw, ...) turns those structures - or the identical ones
   produced by markov_pipeline.run_markov_pipeline() from the GeoTIFFs - into
   the JSON the U4 page renders. Anything computed here is the notebook's own
   arithmetic (A(t+1) = A(t) x P, error = sum|pred - actual| / 2, gains/losses
   from the change matrix) applied to the printed values.
"""

import ast
import json
import os
import re
from datetime import date as _date, timedelta
from typing import Dict, List, Optional

import numpy as np

from notebook_io import (
    cell_source,
    cell_stdout,
    lines_between,
    load_notebook,
    notebook_assignment,
    split_label_numbers,
)

NOTEBOOK = "Shako_Sentinel2_Markov.ipynb"
PERIODS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data",
                            "u4_period_transition_matrices.json")

MARK_C1 = "MARKOV CHAIN – CELL 1"
MARK_C2 = "MARKOV CHAIN – CELL 2"
MARK_C3 = "MARKOV CHAIN – CELL 3"


# ---------------------------------------------------------------------------
# 1. Parse the executed notebook
# ---------------------------------------------------------------------------

def _rows_with_numbers(lines: List[str], n: int, prefix: str = "") -> Dict[str, list]:
    out = {}
    for ln in lines:
        parsed = split_label_numbers(ln, n)
        if parsed:
            label = parsed[0][len(prefix):] if parsed[0].startswith(prefix) else parsed[0]
            out[label.strip()] = parsed[1]
    return out


def load_period_matrices(class_names: List[str]) -> List[dict]:
    with open(PERIODS_FILE, encoding="utf-8") as fh:
        data = json.load(fh)
    if data["classes"] != class_names:
        raise ValueError("Class order in the period-matrix file does not match the notebook")
    return [{"from": p["from"], "to": p["to"], "P": p["P"], "counts": None}
            for p in data["periods"]]


def parse_markov_notebook() -> dict:
    nb = load_notebook(NOTEBOOK)
    src1 = cell_source(nb, MARK_C1)
    src2 = cell_source(nb, MARK_C2)
    classes = ast.literal_eval(notebook_assignment(src1, "CLASSES"))
    colors = ast.literal_eval(notebook_assignment(src1, "COLORS"))
    names = [classes[c] for c in classes]

    t1 = cell_stdout(nb, MARK_C1)
    head = re.search(r"^(.+?) maps: (\d+) dates \((\S+) → (\S+)\), (\d+) x (\d+) pixels", t1, re.M)
    step = re.search(r"one Markov step = (\d+) days", t1)
    valid = re.search(r"Pixels with data on all dates: ([\d,]+) of ([\d,]+)", t1)
    pix = re.search(r"Pixel size ≈ ([\d.]+) m", t1)

    area = []
    for ln in lines_between(t1, "Class area (km²):"):
        m = re.match(r"\s*(\d{4}-\d{2}-\d{2})\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*$", ln)
        if m:
            area.append({"date": m.group(1), "values": [float(m.group(i)) for i in (2, 3, 4)]})
        elif area:
            break

    change_rows = _rows_with_numbers(lines_between(t1, "Area moving between classes", "Cell 1 done"),
                                     3, "From ")
    change = [change_rows[n] for n in names]

    t2 = cell_stdout(nb, MARK_C2)
    p_rows = _rows_with_numbers(lines_between(t2, "Markov transition matrix", "Validation"), 3, "From ")
    P = [p_rows[n] for n in names]

    val_rows = _rows_with_numbers(lines_between(t2, "Validation –", "Total absolute error"), 4)
    validation = [{"class": n, "actual_km2": val_rows[n][0], "predicted_km2": val_rows[n][1],
                   "error_km2": val_rows[n][2], "error_pct": val_rows[n][3]} for n in names]
    val_total = float(re.search(r"Total absolute error: ([\d.]+) %", t2).group(1))
    val_head = re.search(r"predict (\S+) from (\S+)", t2)

    forecast = []
    for ln in lines_between(t2, "Forecast (km²)", "Long-run"):
        m = re.match(r"\s*(\d{4}-\d{2}-\d{2})\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*$", ln)
        if m:
            forecast.append({"date": m.group(1), "values": [float(m.group(i)) for i in (2, 3, 4)]})

    steady = []
    for ln in lines_between(t2, "Long-run (steady-state)"):
        m = re.match(r"\s*(.+?)\s+([\d.]+) %\s+\(([\d.]+) km²\)", ln)
        if m and m.group(1).strip() in names:
            steady.append({"class": m.group(1).strip(), "share_pct": float(m.group(2)),
                           "km2": float(m.group(3))})

    src3 = cell_source(nb, MARK_C3)
    pale = ast.literal_eval(notebook_assignment(src3, "pale"))
    change_colors = ast.literal_eval(notebook_assignment(src3, "change_colors"))

    t3 = cell_stdout(nb, MARK_C3)
    changed = re.search(r"Changed area: ([\d.]+) km² \(([\d.]+) % of the study area\)", t3)

    return {
        "settings": {
            "site": ast.literal_eval(notebook_assignment(src1, "SITE")),
            "sensor": ast.literal_eval(notebook_assignment(src1, "SENSOR")),
            "model": ast.literal_eval(notebook_assignment(src1, "MODEL")),
            "model_title": head.group(1),
            "n_future": int(notebook_assignment(src2, "N_FUTURE")),
            "step_days": int(step.group(1)),
            "class_codes": {str(k): v for k, v in classes.items()},
            "class_colors": {classes[k]: v for k, v in colors.items()},
        },
        "class_names": names,
        "grid": {
            "rows": int(head.group(5)), "cols": int(head.group(6)),
            "valid_pixels": int(valid.group(1).replace(",", "")),
            "total_pixels": int(valid.group(2).replace(",", "")),
            "pixel_size_m": float(pix.group(1)),
        },
        "area": area,
        "periods": load_period_matrices(names),
        "periods_source": "figure_transcription",
        "P": P,
        "validation": {"predict_date": val_head.group(1), "from_date": val_head.group(2),
                       "rows": validation, "total_abs_error_pct": val_total},
        "forecast": forecast,
        "steady_state": steady,
        "change_matrix_km2": change,
        "changed_area": {"km2": float(changed.group(1)), "pct": float(changed.group(2))},
        "change_map_colors": {"unchanged": {int(k): v for k, v in pale.items()},
                              "changed": {int(k): v for k, v in change_colors.items()}},
    }


# ---------------------------------------------------------------------------
# Checks and Markov arithmetic
# ---------------------------------------------------------------------------

def check_period_matrices(raw: dict) -> dict:
    """
    Verify the transcribed per-interval matrices: rows sum to 1 within
    rounding, and the class-area-weighted average of the 8 matrices reproduces
    the notebook's printed pooled P. (Pooling the pixel counts, as the notebook
    does, is the same as weighting each period's rows by the start-date area.)
    """
    A = np.array([a["values"] for a in raw["area"]])
    Ps = np.array([p["P"] for p in raw["periods"]], dtype=float)
    row_sum_dev = float(np.abs(Ps.sum(axis=2) - 1).max())
    weights = A[:-1][:, :, None]
    pooled = (weights * Ps).sum(axis=0) / weights.sum(axis=0)
    dev = float(np.abs(pooled - np.array(raw["P"])).max())
    return {
        "max_row_sum_deviation": round(row_sum_dev, 4),
        "pooled_from_periods": pooled.round(4).tolist(),
        "max_abs_difference_vs_printed_P": round(dev, 4),
        "passed": row_sum_dev <= 0.002 and dev <= 0.002,
    }


def _err_pct(a: np.ndarray, b: np.ndarray) -> float:
    """The notebook's error measure: share of the study area classified differently."""
    return float(100 * np.abs(a - b).sum() / 2)


def _fmt_label(d: str) -> str:
    y, m, dd = (int(x) for x in d.split("-"))
    return _date(y, m, dd).strftime("%d %b").lstrip("0")


# ---------------------------------------------------------------------------
# 2. Build the API response
# ---------------------------------------------------------------------------

def build_u4_response(raw: dict, figures: Dict[str, dict], source: dict,
                      map_previews: Optional[Dict[str, str]] = None) -> dict:
    names = raw["class_names"]
    K = len(names)
    dates = [a["date"] for a in raw["area"]]
    A = np.array([a["values"] for a in raw["area"]])
    totals = A.sum(axis=1)
    share = A / totals[:, None]
    total_km2 = float(totals[-1])           # the notebook scales modelled shares by the last total
    P = np.array(raw["P"], dtype=float)
    step = raw["settings"]["step_days"]

    # --- observations ----------------------------------------------------
    observations = [{
        "date": d, "label": _fmt_label(d), "index": i,
        "area_km2": dict(zip(names, A[i].tolist())),
        "share_pct": dict(zip(names, (100 * share[i]).tolist())),
        "total_km2": float(totals[i]),
        # rendered from the classified GeoTIFF only when it is present in data/inputs/markov/
        "map_url": (map_previews or {}).get(d),
    } for i, d in enumerate(dates)]

    # --- per-interval transitions ----------------------------------------
    periods = []
    for i, p in enumerate(raw["periods"]):
        Pt = np.array(p["P"], dtype=float)
        start = A[i]
        moved = Pt * start[:, None]    # km² that went from class i to class j (approx. if from figure)
        periods.append({
            "index": i,
            "from": p["from"], "to": p["to"],
            "label": f"{_fmt_label(p['from'])} → {_fmt_label(p['to'])}",
            "P": Pt.tolist(),
            "counts": p.get("counts"),
            "area_moved_km2": moved.tolist(),
            "persistence": dict(zip(names, np.diag(Pt).tolist())),
            "start_area_km2": dict(zip(names, start.tolist())),
            "end_area_km2": dict(zip(names, A[i + 1].tolist())),
        })

    # --- anomaly: the interval in which the lake was least persistent ----
    lake = names.index("Glacial Lake") if "Glacial Lake" in names else 1
    glacier = names.index("Glacier") if "Glacier" in names else 0
    land = names.index("Non-Glacier Land") if "Non-Glacier Land" in names else 2
    lake_pers = [pp["P"][lake][lake] for pp in periods]
    anom_i = int(np.argmin(lake_pers))
    others = [pp for pp in periods if pp["index"] != anom_i]
    keep = [k for k in range(len(periods)) if k != anom_i]
    Ps = np.array([pp["P"] for pp in periods])
    w = A[:-1][keep][:, :, None]
    pooled_without = (w * Ps[keep]).sum(axis=0) / w.sum(axis=0)
    anomaly_date_idx = anom_i + 1
    anomaly = {
        "period_index": anom_i,
        "period_label": periods[anom_i]["label"],
        "date": dates[anomaly_date_idx],
        "lake_area_km2": float(A[anomaly_date_idx][lake]),
        "lake_area_other_dates_km2": [float(A[t][lake]) for t in range(len(dates)) if t != anomaly_date_idx],
        "lake_to_glacier": periods[anom_i]["P"][lake][glacier],
        "lake_persistence": periods[anom_i]["P"][lake][lake],
        "lake_to_glacier_other_periods": [min(pp["P"][lake][glacier] for pp in others),
                                          max(pp["P"][lake][glacier] for pp in others)],
        "pooled_lake_to_glacier": float(P[lake][glacier]),
        "pooled_lake_persistence": float(P[lake][lake]),
        "pooled_lake_persistence_without_period": float(round(pooled_without[lake][lake], 4)),
        "pooled_lake_to_glacier_without_period": float(round(pooled_without[lake][glacier], 4)),
    }

    # --- hindcast (P run forward from the first date) and baseline ---------
    hind = [share[0]]
    for _ in range(len(dates) - 1):
        hind.append(hind[-1] @ P)
    hind = np.array(hind)
    hind_err = [_err_pct(hind[t], share[t]) for t in range(len(dates))]
    misses = hind[:, glacier] * total_km2 - A[:, glacier]
    worst = int(np.argmax(np.abs(misses)))

    baseline_err = _err_pct(share[-2], share[-1])
    val = raw["validation"]

    # --- worked example: one step from the last date ----------------------
    one_step = share[-1] @ P * total_km2
    forecast = raw["forecast"]

    # --- change matrix ------------------------------------------------------
    C = np.array(raw["change_matrix_km2"], dtype=float)
    gain = C.sum(axis=0) - np.diag(C)
    loss = C.sum(axis=1) - np.diag(C)
    change_rows = [{
        "class": n, "to_km2": C[i].tolist(), "gain_km2": float(gain[i]),
        "loss_km2": float(loss[i]), "net_km2": float(gain[i] - loss[i]),
        "retained_pct": float(100 * C[i][i] / C[i].sum()) if C[i].sum() else None,
    } for i, n in enumerate(names)]

    def fig(name):
        return figures.get(name)

    codes = [int(k) for k in raw["settings"]["class_codes"]]
    colors = raw.get("change_map_colors")
    legend = []
    if colors:
        for c in codes:
            legend.append({"code": c * 11, "label": f"{names[codes.index(c)]} (no change)",
                           "color": colors["unchanged"].get(c), "changed": False})
        for a_i, a in enumerate(codes):
            for b_i, b in enumerate(codes):
                if a != b and C[a_i][b_i] > 0:
                    legend.append({"code": a * 10 + b, "label": f"{names[a_i]} → {names[b_i]}",
                                   "color": colors["changed"].get(a * 10 + b, "#FF00FF"), "changed": True,
                                   "km2": float(C[a_i][b_i])})

    return {
        "source": source,
        "settings": raw["settings"],
        "classes": [{"code": int(k), "name": v, "color": raw["settings"]["class_colors"].get(v)}
                    for k, v in raw["settings"]["class_codes"].items()],
        "grid": {**raw["grid"], "study_area_km2": total_km2},
        "observations": observations,
        "transitions": {
            "periods": periods,
            "source": raw["periods_source"],
            "check": check_period_matrices(raw) if raw["periods_source"] == "figure_transcription" else None,
        },
        "markov": {
            "P": P.tolist(),
            "step_days": step,
            "worked_example": {
                "start_date": dates[-1],
                "start_km2": A[-1].tolist(),
                "result_km2": one_step.tolist(),
                "next_date": forecast[0]["date"] if forecast else None,
                "notebook_forecast_km2": forecast[0]["values"] if forecast else None,
            },
        },
        "areas": {
            "series": [{"date": d, "label": _fmt_label(d), **dict(zip(names, A[i].tolist()))}
                       for i, d in enumerate(dates)],
            "highlights": {
                "glacier": [float(A[0][glacier]), float(A[-1][glacier])],
                "land": [float(A[0][land]), float(A[-1][land])],
                "lake_range_excl_anomaly": [
                    float(min(A[t][lake] for t in range(len(dates)) if t != anomaly_date_idx)),
                    float(max(A[t][lake] for t in range(len(dates)) if t != anomaly_date_idx)),
                ],
            },
        },
        "change": {
            "first_date": dates[0], "last_date": dates[-1],
            "matrix_km2": C.tolist(),
            "rows": change_rows,
            "changed_km2": raw["changed_area"]["km2"],
            "changed_pct": raw["changed_area"]["pct"],
            "glacier_to_land_km2": float(C[glacier][land]),
            "glacier_to_land_pct_of_glacier": float(100 * C[glacier][land] / C[glacier].sum()),
            "lake_retained_pct": change_rows[lake]["retained_pct"],
            "map": {
                "image_url": (figures.get("markov_change_map_crop.png") or {}).get("url"),
                "legend": legend,
            },
        },
        "validation": {
            **val,
            "baseline_error_pct": baseline_err,
            "hindcast": {
                "series": [{"date": d, "label": _fmt_label(d),
                            **{f"{n}": float(A[t][k]) for k, n in enumerate(names)},
                            **{f"{n} (Markov)": float(hind[t][k] * total_km2) for k, n in enumerate(names)}}
                           for t, d in enumerate(dates)],
                "error_pct_by_date": hind_err,
                "final_error_pct": hind_err[-1],
                "final_glacier_km2": float(hind[-1][glacier] * total_km2),
                "largest_glacier_miss": {"date": dates[worst], "km2": float(misses[worst])},
                "days": (len(dates) - 1) * step,
            },
        },
        "forecast": {
            "base_date": dates[-1],
            "steps": raw["settings"]["n_future"],
            "series": [{"date": f["date"], "label": _fmt_label(f["date"]),
                        **dict(zip(names, f["values"]))} for f in forecast],
            "steady_state": raw["steady_state"],
            "anomaly": anomaly,
        },
        "figures": {
            "class_area": fig("markov_class_area.png"),
            "period_matrices": fig("markov_transition_matrices_by_period.png"),
            "change_gain_loss": fig("markov_change_matrix_gain_loss.png"),
            "persistence": fig("markov_persistence_by_period.png"),
            "hindcast_forecast": fig("markov_hindcast_forecast.png"),
            "validation": fig("markov_matrix_validation.png"),
            "change_map": fig("markov_change_map.png"),
        },
    }
