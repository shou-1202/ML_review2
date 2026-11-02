"""
kmeans_results.py  (U3 - K-Means classification)

Two jobs:

1. parse_kmeans_notebook()  reads the *executed* KMeans_Sentinel2.ipynb and turns
   the tables each cell printed (points per date, k-selection table, cluster vs
   reference cross-table, cluster profile, agreement metrics, class report,
   Decision Tree agreement) into plain Python structures. Every number comes
   from the notebook's saved output - nothing is typed in by hand.

2. build_u3_response(raw, ...) turns those structures (or the identical
   structures produced by kmeans_pipeline.run_kmeans_pipeline() when the raw
   CSVs are available) into the JSON the U3 page renders. The only values
   computed here are exact arithmetic on the parsed numbers: shares, column
   sums, the confusion matrix implied by the cross-table and the cluster names,
   and the totals of every possible one-to-one cluster naming.
"""

import ast
import itertools
import re
from typing import Dict, List, Optional

from notebook_io import (
    cell_source,
    cell_stdout,
    lines_between,
    load_notebook,
    notebook_assignment,
    split_label_numbers,
    to_number,
)

NOTEBOOK = "KMeans_Sentinel2.ipynb"
CLASS_ORDER = ["Glacier", "Glacial Lake", "Non-Glacier Land"]   # class_map order in the notebook
MIXED_LABEL = "Intermediate / Mixed Reflectance"

# Sentinel-2 band metadata for the six features (KMeans_Analysis_Shako report,
# section 3.2 / 3.4). Descriptive only - no result depends on it.
FEATURE_INFO = {
    "Blue": {"band": "B2", "detail": "490 nm · 10 m", "kind": "Reflectance (×10,000)"},
    "Green": {"band": "B3", "detail": "560 nm · 10 m", "kind": "Reflectance (×10,000)"},
    "Red": {"band": "B4", "detail": "665 nm · 10 m", "kind": "Reflectance (×10,000)"},
    "NIR": {"band": "B8", "detail": "842 nm · 10 m", "kind": "Reflectance (×10,000)"},
    "NDSI_Value": {"band": "(B3 − B11) / (B3 + B11)", "detail": "Snow index", "kind": "Index (−1 … 1)"},
    "NDWI_Value": {"band": "(B3 − B8) / (B3 + B8)", "detail": "Water index (McFeeters)", "kind": "Index (−1 … 1)"},
}

MARK_C1 = "CELL 1 — SETTINGS"
MARK_C2 = "CELL 2 — SCALE FEATURES"
MARK_C3 = "CELL 3 — FINAL K-MEANS"
MARK_C4 = "CELL 4 — COMPARE K-MEANS"
MARK_C5 = "CELL 5 — FULL-IMAGE K-MEANS MAPS"


# ---------------------------------------------------------------------------
# 1. Parse the executed notebook
# ---------------------------------------------------------------------------

def _parse_settings(nb: dict) -> dict:
    src1 = cell_source(nb, MARK_C1)
    src2 = cell_source(nb, MARK_C2)
    src3 = cell_source(nb, MARK_C3)
    k_range = re.match(r"range\((\d+),\s*(\d+)\)", notebook_assignment(src1, "K_RANGE"))
    fit_sample = re.search(r"size=min\((\d+)", src2)
    score_sample = re.search(r"idx_fit\[:min\((\d+)", src2)
    n_init = re.search(r"KMeans\(n_clusters=N_CLUSTERS,\s*n_init=(\d+)", src3)
    return {
        "site": ast.literal_eval(notebook_assignment(src1, "SITE")),
        "sensor": ast.literal_eval(notebook_assignment(src1, "SENSOR")),
        "random_state": int(notebook_assignment(src1, "RANDOM_STATE")),
        "n_clusters": int(notebook_assignment(src1, "N_CLUSTERS")),
        "k_range": list(range(int(k_range.group(1)), int(k_range.group(2)))),
        "features": ast.literal_eval(notebook_assignment(src1, "FEATURES")),
        "label_cols": ast.literal_eval(notebook_assignment(src1, "LABEL_COLS")),
        "n_init": int(n_init.group(1)),
        # Not set in the notebook, so scikit-learn's KMeans defaults apply.
        "max_iter": 300,
        "tol": 1e-4,
        "init": "k-means++",
        "k_selection_fit_sample": int(fit_sample.group(1)),
        "k_selection_score_sample": int(score_sample.group(1)),
    }


def _parse_cell1(text: str) -> dict:
    total = re.search(r"(\d+) dates combined -> ([\d,]+) points", text)
    per_date = []
    for line in lines_between(text, "Points per date:"):
        m = re.match(r"\s*(\d{4}-\d{2}-\d{2})\s+(\d+)\s*$", line)
        if m:
            per_date.append({"date": m.group(1), "points": int(m.group(2))})
    return {"n_dates": int(total.group(1)), "total_points": to_number(total.group(2)),
            "points_per_date": per_date}


def _parse_k_table(text: str) -> List[dict]:
    rows = []
    for line in text.splitlines():
        parts = line.split()
        if len(parts) == 4 and parts[0].isdigit():
            rows.append({"k": int(parts[0]), "inertia": float(parts[1]),
                         "silhouette": float(parts[2]), "davies_bouldin": float(parts[3])})
    return rows


def _parse_cell3(text: str) -> dict:
    lines = text.splitlines()
    head_i = next(i for i, ln in enumerate(lines) if ln.strip().startswith("Reference"))
    header = lines[head_i]
    # header columns are class names (with spaces) - recover them in printed order
    names = sorted(CLASS_ORDER, key=lambda n: header.find(n) if n in header else 1e9)
    columns = [n for n in names if n in header]
    crosstab = {}
    for ln in lines[head_i + 2:]:
        parts = ln.split()
        if len(parts) == len(columns) + 1 and all(p.isdigit() for p in parts):
            crosstab[int(parts[0])] = dict(zip(columns, (int(p) for p in parts[1:])))
        elif crosstab:
            break

    mapping_line = next(ln for ln in lines if ln.startswith("Cluster -> class:"))
    cluster_to_class = {int(k): v for k, v in
                        ast.literal_eval(mapping_line.split(":", 1)[1].strip()).items()}

    profile = []
    prof_lines = lines_between(text, "Cluster profile (mean values):")
    for ln in prof_lines:
        parts = ln.split()
        if not parts or not parts[0].isdigit():
            continue
        cluster = int(parts[0])
        means = [float(p) for p in parts[1:7]]
        profile.append({
            "cluster": cluster,
            "means": means,
            "assigned_class": " ".join(parts[7:-1]),
            "points": int(parts[-1]),
        })
    return {"crosstab": crosstab, "crosstab_columns": columns,
            "cluster_to_class": cluster_to_class, "profile": profile}


def _parse_cell4(text: str) -> dict:
    by_date = []
    for line in lines_between(text, "K-means vs reference labels", "Class-wise report"):
        parsed = split_label_numbers(line, 6)
        if parsed and parsed[0] != "Date":
            label, (points, oa, kappa, f1, ari, nmi) = parsed
            by_date.append({"date": label, "points": int(points), "oa": oa, "kappa": kappa,
                            "macro_f1": f1, "ari": ari, "nmi": nmi})

    report, averages, accuracy = [], {}, None
    for line in lines_between(text, "Class-wise report"):
        stripped = line.strip()
        if stripped.startswith("accuracy"):
            accuracy = float(stripped.split()[1])
            continue
        parsed = split_label_numbers(line, 4)
        if not parsed:
            continue
        label, (precision, recall, f1, support) = parsed
        row = {"class": label, "precision": precision, "recall": recall, "f1": f1,
               "support": int(support)}
        if label in ("macro avg", "weighted avg"):
            averages[label.replace(" ", "_")] = row
        else:
            report.append(row)
    return {"metrics_by_date": by_date, "class_report": report,
            "class_report_accuracy": accuracy, **averages}


def _parse_cell5(text: str) -> Optional[dict]:
    if "K-means agreement with each supervised model" not in text:
        return None
    summary = {}
    for line in lines_between(text, "mean over dates", "Overall agreement (%) per date"):
        parsed = split_label_numbers(line, 3)
        if parsed and parsed[0] not in ("Model", "OA_% Kappa"):
            name, (oa, kappa, f1) = parsed
            summary = {"model": name, "oa": oa, "kappa": kappa, "macro_f1": f1}
    by_date = []
    for line in lines_between(text, "Overall agreement (%) per date"):
        m = re.match(r"\s*(\d{4}-\d{2}-\d{2})\s+([\d.]+)\s*$", line)
        if m:
            by_date.append({"date": m.group(1), "oa": float(m.group(2))})
    return {**summary, "by_date": by_date}


def parse_kmeans_notebook() -> dict:
    nb = load_notebook(NOTEBOOK)
    settings = _parse_settings(nb)
    raw = {"settings": settings}
    raw.update(_parse_cell1(cell_stdout(nb, MARK_C1)))
    raw["k_table"] = _parse_k_table(cell_stdout(nb, MARK_C2))
    raw.update(_parse_cell3(cell_stdout(nb, MARK_C3)))
    raw.update(_parse_cell4(cell_stdout(nb, MARK_C4)))
    raw["decision_tree"] = _parse_cell5(cell_stdout(nb, MARK_C5))
    return raw


# ---------------------------------------------------------------------------
# 2. Build the API response
# ---------------------------------------------------------------------------

def _pct(part: float, whole: float) -> Optional[float]:
    return None if not whole else 100.0 * part / whole


def build_u3_response(raw: dict, figures: Dict[str, dict], source: dict) -> dict:
    s = raw["settings"]
    features = s["features"]
    total = raw["total_points"]
    crosstab: Dict[int, Dict[str, int]] = raw["crosstab"]
    classes_present = [c for c in CLASS_ORDER if c in raw["crosstab_columns"]]
    c2c = raw["cluster_to_class"]

    # --- dataset ---------------------------------------------------------
    ref_totals = {c: sum(row[c] for row in crosstab.values()) for c in classes_present}
    dataset = {
        "site": s["site"],
        "sensor": s["sensor"],
        "n_dates": raw["n_dates"],
        "total_points": total,
        "features": [{"name": f, **FEATURE_INFO.get(f, {})} for f in features],
        "label_columns": s["label_cols"],
        "points_per_date": raw["points_per_date"],
        "reference_composition": [
            {"class": c, "points": ref_totals[c], "share": _pct(ref_totals[c], total)}
            for c in classes_present
        ],
    }

    # --- k selection -----------------------------------------------------
    rows = []
    prev = None
    for r in raw["k_table"]:
        drop = None if prev is None else _pct(prev - r["inertia"], prev)
        rows.append({**r, "inertia_drop_pct": drop})
        prev = r["inertia"]
    best_sil = max(rows, key=lambda r: r["silhouette"])["k"]
    best_db = min(rows, key=lambda r: r["davies_bouldin"])["k"]
    largest_drop = max((r for r in rows if r["inertia_drop_pct"] is not None),
                       key=lambda r: r["inertia_drop_pct"])["k"]
    k_selection = {
        "selected_k": s["n_clusters"],
        "rows": rows,
        "best_silhouette_k": best_sil,
        "best_davies_bouldin_k": best_db,
        "largest_inertia_drop_k": largest_drop,
        "fit_sample": s["k_selection_fit_sample"],
        "score_sample": s["k_selection_score_sample"],
    }

    # --- clusters --------------------------------------------------------
    clusters = []
    for p in raw["profile"]:
        cid = p["cluster"]
        counts = crosstab.get(cid, {})
        size = sum(counts.values()) or p["points"]
        assigned = c2c.get(cid, p["assigned_class"])
        purity = _pct(counts.get(assigned, 0), size)
        majority = max(counts, key=counts.get) if counts else assigned
        clusters.append({
            "id": cid,
            "points": p["points"],
            "share": _pct(p["points"], total),
            "means": dict(zip(features, p["means"])),
            "assigned_class": assigned,
            # The Hungarian name is kept only if that class is actually the
            # majority of the cluster's points; otherwise it is a mixed group.
            "interpretation": assigned if (purity or 0) >= 50 else MIXED_LABEL,
            "assigned_class_purity": purity,
            "majority_class": majority,
            "composition": [
                {"class": c, "points": counts.get(c, 0), "share": _pct(counts.get(c, 0), size)}
                for c in classes_present
            ],
        })

    # every one-to-one naming of clusters -> classes, with its matched total
    cluster_ids = sorted(crosstab)
    naming_options = []
    if len(cluster_ids) <= len(classes_present):
        for perm in itertools.permutations(classes_present, len(cluster_ids)):
            mapping = dict(zip(cluster_ids, perm))
            matched = sum(crosstab[c][mapping[c]] for c in cluster_ids)
            naming_options.append({
                "mapping": {str(k): v for k, v in mapping.items()},
                "matched_points": matched,
                "selected": all(mapping[c] == c2c[c] for c in cluster_ids),
            })
        naming_options.sort(key=lambda o: -o["matched_points"])

    matched = sum(crosstab[c][c2c[c]] for c in cluster_ids)
    disagree_total = total - matched
    mixed = [c for c in clusters if c["interpretation"] == MIXED_LABEL]
    disagree_in_mixed = sum(
        sum(v for cls, v in crosstab[c["id"]].items() if cls != c2c[c["id"]]) for c in mixed
    )

    # --- evaluation ------------------------------------------------------
    # confusion matrix rows = reference class, cols = K-Means class, order = class_map
    confusion = [[0] * len(classes_present) for _ in classes_present]
    for cid, counts in crosstab.items():
        j = classes_present.index(c2c[cid])
        for cls, n in counts.items():
            confusion[classes_present.index(cls)][j] += n

    overall = next((r for r in raw["metrics_by_date"] if r["date"] == "ALL DATES"), None)
    per_date = [r for r in raw["metrics_by_date"] if r["date"] != "ALL DATES"]
    dt = raw.get("decision_tree")
    dt_by_date = {r["date"]: r["oa"] for r in (dt or {}).get("by_date", [])}

    evaluation = {
        "overall": overall,
        "confusion_matrix": {"labels": classes_present, "rows": "Reference class",
                             "columns": "K-Means class", "values": confusion},
        "class_report": raw["class_report"],
        "accuracy": raw.get("class_report_accuracy"),
        "macro_avg": raw.get("macro_avg"),
        "weighted_avg": raw.get("weighted_avg"),
        "by_date": per_date,
        "decision_tree": None if not dt else {
            "model": dt.get("model"), "oa": dt.get("oa"), "kappa": dt.get("kappa"),
            "macro_f1": dt.get("macro_f1"),
        },
        "matched_points": matched,
        "disagreeing_points": disagree_total,
        "disagreeing_in_mixed_cluster": disagree_in_mixed,
    }

    # --- maps ------------------------------------------------------------
    metrics_by_date = {r["date"]: r for r in per_date}
    map_dates = []
    for d in raw["points_per_date"]:
        date = d["date"]
        fig = figures.get(f"kmeans_map_{date}.png")
        map_dates.append({
            "date": date,
            "image_url": fig["url"] if fig else None,
            "points": d["points"],
            "metrics": metrics_by_date.get(date),
            "decision_tree_oa": dt_by_date.get(date),
        })

    def fig(name):
        return figures.get(name)

    return {
        "source": source,
        "settings": s,
        "dataset": dataset,
        "k_selection": k_selection,
        "clusters": clusters,
        "naming": {
            "method": "Hungarian algorithm (scipy.optimize.linear_sum_assignment) on the cluster × reference table",
            "crosstab": {"columns": classes_present,
                         "rows": [{"cluster": c, **{k: crosstab[c][k] for k in classes_present}}
                                  for c in cluster_ids]},
            "cluster_to_class": {str(k): v for k, v in c2c.items()},
            "options": naming_options,
        },
        "evaluation": evaluation,
        "maps": {
            "dates": map_dates,
            "extent": "≈ 88.596–88.640° E · 27.940–27.993° N (490 × 591 px grid, ~10 m)",
        },
        "figures": {
            "k_selection": fig("kmeans_k_selection.png"),
            "confusion": fig("kmeans_confusion_vs_reference.png"),
            "maps": fig("kmeans_maps_shako.png"),
            "agreement": fig("kmeans_agreement.png"),
        },
    }
