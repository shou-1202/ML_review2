"""
notebook_io.py

Small helpers for reading an *executed* Jupyter notebook: finding a cell by a
marker in its source, reading the text it printed, and pulling out the PNG
figures it displayed.

Nothing here knows anything about K-Means or Markov chains - the two result
modules (kmeans_results.py, markov_results.py) use these helpers to turn the
notebooks' saved outputs into structured data.
"""

import base64
import json
import os
import re
from functools import lru_cache
from typing import List

NOTEBOOK_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "notebooks")


@lru_cache(maxsize=None)
def load_notebook(filename: str) -> dict:
    path = os.path.join(NOTEBOOK_DIR, filename)
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Notebook not found: {path}. The backend reads its reference results "
            f"from the executed notebook saved in backend/notebooks/."
        )
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _source(cell: dict) -> str:
    src = cell.get("source", "")
    return "".join(src) if isinstance(src, list) else src


def find_cell(nb: dict, marker: str) -> dict:
    """Return the first code cell whose source contains `marker`."""
    for cell in nb["cells"]:
        if cell.get("cell_type") == "code" and marker in _source(cell):
            return cell
    raise LookupError(f"No code cell containing {marker!r} in the notebook")


def cell_source(nb: dict, marker: str) -> str:
    return _source(find_cell(nb, marker))


def cell_stdout(nb: dict, marker: str) -> str:
    """All text the cell printed to stdout, joined in output order."""
    cell = find_cell(nb, marker)
    parts = []
    for out in cell.get("outputs", []):
        if out.get("output_type") == "stream" and out.get("name") == "stdout":
            text = out.get("text", "")
            parts.append("".join(text) if isinstance(text, list) else text)
    if not parts:
        raise LookupError(f"Cell {marker!r} has no saved stdout - was the notebook executed?")
    return "".join(parts)


def cell_pngs(nb: dict, marker: str) -> List[bytes]:
    """Every PNG figure the cell displayed, in output order."""
    cell = find_cell(nb, marker)
    images = []
    for out in cell.get("outputs", []):
        data = out.get("data", {})
        if "image/png" in data:
            b64 = data["image/png"]
            b64 = "".join(b64) if isinstance(b64, list) else b64
            images.append(base64.b64decode(b64))
    return images


def notebook_assignment(source: str, name: str) -> str:
    """Raw right-hand side of `NAME = ...` in a cell's source (first match)."""
    match = re.search(rf"^\s*{re.escape(name)}\s*=\s*(.+?)(?:\s+#.*)?$", source, re.MULTILINE)
    if not match:
        raise LookupError(f"Setting {name!r} not found in notebook source")
    return match.group(1).strip()


# ---------------------------------------------------------------------------
# Parsing pandas `to_string()` output
# ---------------------------------------------------------------------------

NUMBER = r"[-+]?\d[\d,]*\.?\d*(?:[eE][-+]?\d+)?"


def to_number(token: str):
    token = token.replace(",", "")
    value = float(token)
    return int(value) if re.fullmatch(r"[-+]?\d+", token) else value


def split_label_numbers(line: str, n_numbers: int):
    """
    Split a printed table row into (label, [numbers]) where the label may
    itself contain spaces (e.g. 'Non-Glacier Land', 'ALL DATES') and the last
    `n_numbers` whitespace-separated tokens are numeric.
    """
    tokens = line.split()
    if len(tokens) < n_numbers + 1:
        return None
    tail = tokens[-n_numbers:]
    if not all(re.fullmatch(NUMBER, t) for t in tail):
        return None
    return " ".join(tokens[:-n_numbers]), [to_number(t) for t in tail]


def lines_between(text: str, start: str, end: str = None) -> List[str]:
    """Non-empty lines after the line containing `start` and before `end`."""
    lines = text.splitlines()
    try:
        i = next(k for k, ln in enumerate(lines) if start in ln)
    except StopIteration as exc:
        raise LookupError(f"{start!r} not found in cell output") from exc
    out = []
    for ln in lines[i + 1:]:
        if end is not None and end in ln:
            break
        if ln.strip():
            out.append(ln)
    return out
