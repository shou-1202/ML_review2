"""
FastAPI backend for the Shako Lake ML Research Lab.

  GET /            -> health check
  GET /u3/results  -> U3 K-Means results, parsed from the executed
                      KMeans_Sentinel2.ipynb saved outputs
  GET /u4/results  -> U4 Markov chain results, parsed from the executed
                      Shako_Sentinel2_Markov.ipynb saved outputs
  GET /u3/rerun    -> re-executes the notebook's K-Means processing (Cells 1-4)
                      from the original spectral CSVs, if they are present
  GET /u4/rerun    -> re-executes the notebook's Markov processing (Cells 1-3)
                      from the classified GeoTIFFs, if they are present
  /static/...      -> figures extracted from the notebooks' embedded PNG outputs

The raw inputs (spectral CSVs, classified GeoTIFFs) are not part of the
notebooks or reports, so the /rerun endpoints answer 409 with the list of
files they need until those are placed in backend/data/inputs/.
"""

import logging
import os
from contextlib import asynccontextmanager
from functools import lru_cache

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

import kmeans_pipeline
import markov_pipeline
from figures import STATIC_DIR, ensure_figures
from kmeans_results import NOTEBOOK as KMEANS_NB, build_u3_response, parse_kmeans_notebook
from markov_results import (NOTEBOOK as MARKOV_NB, build_u4_response, check_period_matrices,
                            parse_markov_notebook)
from schemas import U3Results, U4Results

log = logging.getLogger("shako")


@lru_cache(maxsize=1)
def _kmeans_raw() -> dict:
    return parse_kmeans_notebook()


@lru_cache(maxsize=1)
def _markov_raw() -> dict:
    return parse_markov_notebook()


@lru_cache(maxsize=1)
def _figures() -> dict:
    return ensure_figures([d["date"] for d in _kmeans_raw()["points_per_date"]])


@asynccontextmanager
async def lifespan(_app):
    # Extract the notebook figures and verify the transcribed U4 matrices once,
    # so the first page load is fast and any problem shows up in the log.
    try:
        _figures()
        check = check_period_matrices(_markov_raw())
        log.warning("U4 period matrices check: %s (max |Δ| vs printed P = %s)",
                    "passed" if check["passed"] else "FAILED",
                    check["max_abs_difference_vs_printed_P"])
    except Exception as exc:  # pragma: no cover - endpoints will surface the real error
        log.error("Startup preparation failed: %s", exc)
    yield


app = FastAPI(
    title="Shako Lake ML Research Backend",
    description="Serves the U3 K-Means and U4 Markov chain results derived from the executed notebooks.",
    lifespan=lifespan,
)

# Allow the Vite React frontend (local dev + GitHub Pages) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:4173", "http://127.0.0.1:4173",
        # GitHub Pages production origin
        "https://shou-1202.github.io",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


def _source(kind: str, notebook: str, status: dict, description: str) -> dict:
    return {"kind": kind, "notebook": notebook, "description": description, "rerun": status}


def _respond(model, payload: dict) -> JSONResponse:
    # Validate against the documented schema, then return the payload as-is.
    model.model_validate(payload)
    return JSONResponse(content=payload)


@app.get("/")
def health():
    return {
        "status": "ok",
        "service": "Shako Lake ML Research Backend",
        "endpoints": ["/u3/results", "/u4/results", "/u3/rerun", "/u4/rerun"],
    }


# ---------------------------------------------------------------- U3 -----

@app.get("/u3/results", response_model=U3Results)
def u3_results():
    try:
        payload = build_u3_response(
            _kmeans_raw(), _figures(),
            _source("notebook_outputs", KMEANS_NB, kmeans_pipeline.input_status(),
                    "Saved outputs of the executed notebook (Cells 1–6) and its embedded figures."),
        )
        return _respond(U3Results, payload)
    except (FileNotFoundError, LookupError) as exc:
        raise HTTPException(status_code=500, detail=f"Could not read the K-Means notebook outputs: {exc}") from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Building U3 results failed: {exc}") from exc


@app.get("/u3/rerun", response_model=U3Results)
def u3_rerun():
    try:
        raw = kmeans_pipeline.run_kmeans_pipeline()
    except kmeans_pipeline.MissingInputs as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"K-Means rerun failed: {exc}") from exc
    payload = build_u3_response(
        raw, _figures(),
        _source("rerun", KMEANS_NB, kmeans_pipeline.input_status(),
                "Re-executed Cells 1–4 from the spectral CSVs in backend/data/inputs/kmeans/. "
                "Maps and Decision Tree agreement still come from the notebook figures."),
    )
    return _respond(U3Results, payload)


# ---------------------------------------------------------------- U4 -----

@app.get("/u4/results", response_model=U4Results)
def u4_results():
    try:
        payload = build_u4_response(
            _markov_raw(), _figures(),
            _source("notebook_outputs", MARKOV_NB, markov_pipeline.input_status(),
                    "Saved outputs of the executed notebook (Cells 1–3) and its embedded figures."),
            markov_pipeline.class_map_previews(),
        )
        return _respond(U4Results, payload)
    except (FileNotFoundError, LookupError, ValueError) as exc:
        raise HTTPException(status_code=500, detail=f"Could not read the Markov notebook outputs: {exc}") from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Building U4 results failed: {exc}") from exc


@app.get("/u4/rerun", response_model=U4Results)
def u4_rerun():
    try:
        raw = markov_pipeline.run_markov_pipeline()
    except markov_pipeline.MissingInputs as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"Markov rerun failed: {exc}") from exc
    payload = build_u4_response(
        raw, _figures(),
        _source("rerun", MARKOV_NB, markov_pipeline.input_status(),
                "Re-executed Cells 1–3 from the classified GeoTIFFs in backend/data/inputs/markov/."),
        markov_pipeline.class_map_previews(),
    )
    return _respond(U4Results, payload)
