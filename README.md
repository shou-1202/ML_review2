# Shako Lake ML Research Lab

Interactive research website for two machine-learning experiments on Shako Lake,
North Sikkim, using Sentinel-2 observations from 14 Nov to 24 Dec 2025:

- **U3 – K-Means Clustering** — unsupervised grouping of 647,811 Sentinel-2 sample
  points into three spectral clusters, compared with the threshold reference labels.
- **U4 – Markov Chain Change Analysis** — a first-order Markov chain built from nine
  Decision Tree classified maps: transition matrices, change detection, validation
  and a six-step forecast.

The site is a cinematic, editorial research website: full-height heroes over a
rendered Himalayan glacier-lake landscape, large serif headlines, snow-white
content sections with publication-style charts, and a horizontal stage
navigation on each experiment page that opens that stage's explanation, real
results, interactive visuals and the original notebook figures. The frontend is
React + Vite + Tailwind + Framer Motion; the backend is FastAPI.

## Run it locally

You need **Python 3.10+** and **Node.js 18+**. Use two terminals.

**1. Backend (FastAPI, port 8000)**

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate      macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Check http://localhost:8000/u3/results — you should see JSON. Interactive API docs
are at http://localhost:8000/docs. On startup the log prints
`U4 period matrices check: passed`.

**2. Frontend (Vite, port 5173)**

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The API address is read from `frontend/.env`
(`VITE_API_URL=http://localhost:8000`). If the backend isn't running, each page
shows an error with a **Try again** button.

Production build: `npm run build` (output in `frontend/dist/`, preview with
`npm run preview` on port 4173, which the backend also allows).

## Where the numbers come from

Every result shown is read from the **executed notebooks' saved outputs** in
`backend/notebooks/` — nothing is retyped or simulated:

| Module | Does |
|---|---|
| `backend/notebook_io.py` | Finds cells by a marker in their source; reads printed text and embedded PNGs |
| `backend/kmeans_results.py` | Parses `KMeans_Sentinel2.ipynb` (points per date, k table, cross-table, cluster profile, metrics, class report, Decision Tree agreement) and builds `GET /u3/results` |
| `backend/markov_results.py` | Parses `Shako_Sentinel2_Markov.ipynb` (class areas, P, validation, forecast, steady state, change matrix, changed area) and builds `GET /u4/results` |
| `backend/figures.py` | Extracts all 11 embedded figures to `backend/static/figures/`, crops the K-Means 3 × 3 map figure into one image per date, and crops the map area of the change map |
| `backend/schemas.py` | Pydantic schemas for both responses (validated on every request) |

Values the backend *computes* are only exact arithmetic on the printed numbers,
using the notebooks' own formulas: shares and totals, the confusion matrix implied
by the cross-table and cluster names, every possible Hungarian naming, gains/losses,
the no-change baseline (0.89%) and the hindcast (0.26%), which the notebook plots
but does not print.

One exception is documented in the UI: the **per-interval transition matrices**
(U4 Step 2) are only drawn in a notebook figure, never printed. They are
transcribed from that figure's 3-decimal labels into
`backend/data/u4_period_transition_matrices.json` and checked on every startup —
rows sum to 1, and area-weighting them reproduces the printed pooled matrix P to
within 0.0001.

## Rerunning the processing (optional)

The raw inputs are not part of the notebooks or reports, so by default the site
shows the reference run. The processing is ported to Python and runs once the
inputs are supplied (see `backend/data/inputs/README.md`):

| Endpoint | Needs | Re-executes |
|---|---|---|
| `GET /u3/rerun` | `backend/data/inputs/kmeans/Sentinel2_Spectral_Values_<date>.csv` × 9 | K-Means Cells 1–4 (`kmeans_pipeline.py`) |
| `GET /u4/rerun` | `backend/data/inputs/markov/classified_Sentinel2_<date>.tif` × 9 | Markov Cells 1–3 (`markov_pipeline.py`) |

Without those files the endpoints return HTTP 409 naming the missing files, and
the data-source band at the bottom of each page says what a rerun would need. Once they're present, a
**Rerun from source data** button appears. With the GeoTIFFs present, U4 Step 1
also shows each date's classified map.

## Design system

| | |
|---|---|
| Colours | Snow `#F5F8FA`, pale glacier blue `#DCEFFA`, midnight `#071522`, navy `#102B45`, glacier cyan `#55B9E8`, ice `#A9D9F3`, coral `#FF694F`, silver `#CDD9E1` — all in `frontend/tailwind.config.js` |
| Type | Cormorant Garamond (headlines), Manrope (body), DM Mono (scientific labels and numbers). Self-hosted through `@fontsource`, so no external font requests |
| Classes | Glacier grey, Glacial Lake blue, Non-Glacier Land brown — the notebooks' map colours, tuned for the light background in `src/utils/classes.js`; map images keep the exact notebook colours |
| Motion | One headline reveal on the home page, slow hero drift, cross-fading K-Means maps in the U3 hero, a canvas node network in the U4 hero, and stage transitions. All of it respects *reduce motion* |

### Hero images

`frontend/public/images/hero-landscape*.jpg` (home) and `hero-aerial*.jpg` (U4) are
procedural renders made by `tools/render_landscape.py` (`python tools/render_landscape.py`
regenerates them). They are illustrations, not photographs of Shako Cho, and the
home hero says so in its corner caption. To use a real photograph, replace both
sizes of a file with your own image under the same names (2560 px and 1440 px
wide, landscape). Then remove the caption at the bottom of the hero in
`src/pages/Home.jsx` and the last sentence of the footer's Data column.

## Project layout
```
backend/
  main.py                 FastAPI app and endpoints
  notebook_io.py          notebook reading helpers
  kmeans_results.py       U3 parser + response builder
  markov_results.py       U4 parser + response builder
  kmeans_pipeline.py      U3 rerun (needs CSVs)
  markov_pipeline.py      U4 rerun + map previews (needs GeoTIFFs)
  figures.py              figure extraction / map cropping
  schemas.py              response schemas
  notebooks/              the two executed notebooks (source of truth)
  data/                   transcribed U4 interval matrices; inputs/ for reruns
  static/figures/         extracted notebook figures (regenerated on startup)
frontend/
  public/images/          hero renders
  src/pages/              Home, KMeansLab, MarkovLab (each with its own hero)
  src/components/         Navbar, Footer, LabPage, PipelineStepper/Stage (horizontal
                          stage nav), StageDetails (editorial building blocks),
                          DataTable, MetricCard, MatrixHeatmap, TransitionMatrix,
                          MapGallery, LoadingState, SourceBar, ParticleField,
                          charts/LineChart, charts/ShareRibbon
  src/components/kmeans/  the six U3 stages
  src/components/markov/  the seven U4 stages + shared date/interval selection
  src/services/           Axios client (api.js) and useApi hook
tools/
  render_landscape.py     procedural hero renders
```

Each stage is linkable: `/kmeans?step=4`, `/markov?step=7`. On U4, the dates and
intervals on the hero timeline open the Observations and Transitions stages with
that date or interval selected.
