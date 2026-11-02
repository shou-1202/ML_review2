"""
kmeans_pipeline.py  (U3 rerun)

The processing of KMeans_Sentinel2.ipynb Cells 1-4, ported to functions:
combine the date-wise spectral CSVs, set the labels aside, standardise the six
features, score k = 2..8, fit the final K-Means, name clusters with the
Hungarian algorithm, and compare with the reference labels.

It only runs when the original inputs are present in
backend/data/inputs/kmeans/  (Sentinel2_Spectral_Values_<date>.csv, one per
date - the files the notebook reads from "Data/Shako/Data sample/Sentinel2/
Sample Levels/Spectral"). They are not part of the notebook or the reports, so
by default the site shows the executed notebook's saved outputs instead.

The settings (features, k range, random state, n_init, sample sizes) are read
from the notebook source so a rerun uses exactly the notebook's configuration.
Cell 5/6 (full-image maps) additionally need the 10-band GeoTIFF scenes and are
not part of the rerun - the map gallery always shows the notebook's figure.
"""

import glob
import os
import re

import numpy as np
import pandas as pd

from kmeans_results import CLASS_ORDER, NOTEBOOK, _parse_settings
from notebook_io import load_notebook

INPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "inputs", "kmeans")
CSV_PATTERN = "*_Spectral_Values_*.csv"


class MissingInputs(FileNotFoundError):
    pass


def input_status() -> dict:
    files = sorted(glob.glob(os.path.join(INPUT_DIR, CSV_PATTERN)))
    return {
        "available": len(files) > 0,
        "input_dir": "backend/data/inputs/kmeans/",
        "expected": "Sentinel2_Spectral_Values_<YYYY-MM-DD>.csv (one per date, 9 for Shako), "
                    "with Blue, Green, Red, NIR, NDSI_Value, NDWI_Value, Final_Class, level_numerical",
        "found_files": len(files),
    }


def _extract_date(name):
    m = re.search(r"\d{4}-\d{2}-\d{2}", name)
    return m.group(0) if m else None


def run_kmeans_pipeline(input_dir: str = INPUT_DIR) -> dict:
    # heavy imports only when a rerun is actually requested
    from scipy.optimize import linear_sum_assignment
    from sklearn.cluster import KMeans
    from sklearn.metrics import (accuracy_score, adjusted_rand_score, classification_report,
                                 cohen_kappa_score, davies_bouldin_score, f1_score,
                                 normalized_mutual_info_score, silhouette_score)
    from sklearn.preprocessing import StandardScaler

    s = _parse_settings(load_notebook(NOTEBOOK))
    FEATURES, LABEL_COLS, RS = s["features"], s["label_cols"], s["random_state"]

    # ---- Cell 1: combine all date-wise CSVs ----
    csv_files = sorted(glob.glob(os.path.join(input_dir, CSV_PATTERN)))
    if not csv_files:
        raise MissingInputs(
            "Rerunning U3 requires the original spectral CSVs, which are not included with the "
            f"notebook. Place {input_status()['expected']} in backend/data/inputs/kmeans/."
        )
    parts = []
    for f in csv_files:
        df = pd.read_csv(f)
        df["Date"] = _extract_date(os.path.basename(f))
        parts.append(df.dropna(subset=FEATURES))
    all_df = pd.concat(parts, ignore_index=True)
    reference = all_df["Final_Class"].astype(str).to_numpy()
    features_df = all_df.drop(columns=[c for c in LABEL_COLS if c in all_df.columns])
    counts = features_df["Date"].value_counts().sort_index()

    # ---- Cell 2: scale + choose k ----
    X = features_df[FEATURES].to_numpy(dtype=float)
    X_scaled = StandardScaler().fit(X).transform(X)
    rng = np.random.default_rng(RS)
    idx_fit = rng.choice(len(X_scaled), size=min(s["k_selection_fit_sample"], len(X_scaled)), replace=False)
    idx_sil = idx_fit[:min(s["k_selection_score_sample"], len(idx_fit))]
    k_table = []
    for k in s["k_range"]:
        km = KMeans(n_clusters=k, n_init=s["n_init"], random_state=RS).fit(X_scaled[idx_fit])
        lab = km.predict(X_scaled[idx_sil])
        k_table.append({"k": k, "inertia": float(km.inertia_),
                        "silhouette": float(silhouette_score(X_scaled[idx_sil], lab)),
                        "davies_bouldin": float(davies_bouldin_score(X_scaled[idx_sil], lab))})

    # ---- Cell 3: final K-Means + Hungarian naming ----
    kmeans = KMeans(n_clusters=s["n_clusters"], n_init=s["n_init"], random_state=RS).fit(X_scaled)
    clusters = kmeans.labels_
    ref_classes = sorted(set(reference))
    table = pd.crosstab(pd.Series(clusters, name="Cluster"), pd.Series(reference, name="Reference"))
    table = table.reindex(columns=ref_classes, fill_value=0)
    if s["n_clusters"] <= len(ref_classes):
        r_idx, c_idx = linear_sum_assignment(-table.to_numpy())
        c2c = {int(table.index[r]): table.columns[c] for r, c in zip(r_idx, c_idx)}
    else:
        c2c = {int(c): table.loc[c].idxmax() for c in table.index}
    kmeans_class = np.array([c2c[int(c)] for c in clusters])

    prof = features_df[FEATURES].assign(Cluster=clusters).groupby("Cluster").mean()
    sizes = pd.Series(clusters).value_counts().sort_index()

    # ---- Cell 4: compare with the reference labels ----
    def scores(ref, pred, ref_clusters):
        return {"points": int(len(ref)), "oa": 100 * accuracy_score(ref, pred),
                "kappa": cohen_kappa_score(ref, pred),
                "macro_f1": f1_score(ref, pred, average="macro", zero_division=0),
                "ari": adjusted_rand_score(ref, ref_clusters),
                "nmi": normalized_mutual_info_score(ref, ref_clusters)}

    dates = features_df["Date"].to_numpy()
    by_date = [{"date": "ALL DATES", **scores(reference, kmeans_class, clusters)}]
    for d in sorted(set(dates)):
        m = dates == d
        by_date.append({"date": d, **scores(reference[m], kmeans_class[m], clusters[m])})

    rep = classification_report(reference, kmeans_class, output_dict=True, zero_division=0)

    def rep_row(name):
        r = rep[name]
        return {"class": name, "precision": r["precision"], "recall": r["recall"],
                "f1": r["f1-score"], "support": int(r["support"])}

    return {
        "settings": s,
        "n_dates": len(csv_files),
        "total_points": int(len(features_df)),
        "points_per_date": [{"date": d, "points": int(n)} for d, n in counts.items()],
        "k_table": k_table,
        "crosstab": {int(c): {k: int(v) for k, v in table.loc[c].items()} for c in table.index},
        "crosstab_columns": list(table.columns),
        "cluster_to_class": c2c,
        "profile": [{"cluster": int(c), "means": [float(v) for v in prof.loc[c, FEATURES]],
                     "assigned_class": c2c[int(c)], "points": int(sizes.loc[c])} for c in prof.index],
        "metrics_by_date": by_date,
        "class_report": [rep_row(c) for c in sorted(set(reference) | set(kmeans_class))
                         if c in rep and c in CLASS_ORDER],
        "class_report_accuracy": rep["accuracy"],
        "macro_avg": rep_row("macro avg"),
        "weighted_avg": rep_row("weighted avg"),
        "decision_tree": None,   # needs the full-image maps (Cell 5) - not part of the rerun
    }
