# Optional rerun inputs

The website works without anything in this folder: it shows the results saved in
the executed notebooks. Put the original inputs here only if you want the backend
to re-execute the notebook processing.

## `kmeans/` — enables `GET /u3/rerun`

The nine date-wise spectral sample files the K-Means notebook reads from
`Data/Shako/Data sample/Sentinel2/Sample Levels/Spectral/`:

```
Sentinel2_Spectral_Values_2025-11-14.csv
Sentinel2_Spectral_Values_2025-11-19.csv
...
Sentinel2_Spectral_Values_2025-12-24.csv
```

Required columns: `Blue, Green, Red, NIR, NDSI_Value, NDWI_Value, Final_Class,
level_numerical` (X and Y may be present; they are not used as features).

Re-executes Cells 1–4: combine, scale, k = 2–8 scores, final K-Means (k = 3,
n_init = 10, random_state = 42), Hungarian naming, agreement metrics. Fitting on
~650k points takes roughly a minute. The full-image maps (Cells 5–6) also need the
10-band scenes, so the map gallery keeps showing the notebook's figure.

## `markov/` — enables `GET /u4/rerun` and the Step 1 map previews

The nine Decision Tree classified maps the Markov notebook reads from
`Data/Shako/Data sample/Sentinel2/Sample Levels/Spectral/models/output/`:

```
classified_Sentinel2_2025-11-14.tif
...
classified_Sentinel2_2025-12-24.tif
```

Single band, codes 1 = Glacier, 2 = Glacial Lake, 3 = Non-Glacier Land, 0 = no
data. Requires the `rasterio` package (in `requirements.txt`). A rerun computes the
per-interval matrices and pixel counts exactly, replacing the figure transcription.
