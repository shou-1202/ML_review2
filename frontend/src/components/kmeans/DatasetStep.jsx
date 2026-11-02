import DataTable from "../DataTable";
import { ClassName, Code, Narrative, Note, Split, StatGrid, WhatHappened, WhyPerformed } from "../StageDetails";
import { classColor } from "../../utils/classes";
import { formatDate, formatInt, formatPct } from "../../utils/format";

function ShareBar({ parts }) {
  return (
    <div className="flex h-4 w-full overflow-hidden" role="img" aria-label="Reference class shares">
      {parts.map((p) => (
        <div
          key={p.class}
          title={`${p.class}: ${formatPct(p.share, 2)}`}
          className="h-full border-r-2 border-snow last:border-r-0"
          style={{ width: `${p.share}%`, backgroundColor: classColor(p.class) }}
        />
      ))}
    </div>
  );
}

export default function DatasetStep({ data }) {
  const ds = data.dataset;
  const fullGrid = Math.max(...ds.points_per_date.map((d) => d.points));
  const perDate = ds.points_per_date.map((d) => ({ date: d.date, points: d.points, dropped: fullGrid - d.points }));

  return (
    <>
      <StatGrid
        columns={4}
        items={[
          ["Observation dates", ds.n_dates],
          ["Sample points", formatInt(ds.total_points)],
          ["Features", ds.features.length],
          ["Label columns removed", ds.label_columns.length],
        ]}
      />

      <WhatHappened>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            The notebook read the {ds.n_dates} date-wise spectral files (
            <Code>Sentinel2_Spectral_Values_&lt;date&gt;.csv</Code>), tagged each row with its date and stacked them
            into one table of <strong className="tabular">{formatInt(ds.total_points)}</strong> sample points.
          </li>
          <li>Rows with a missing feature value (no-data pixels at the image edge) were dropped.</li>
          <li>
            The reference label columns{" "}
            {ds.label_columns.map((c, i) => (
              <span key={c}>
                {i > 0 && " and "}
                <Code>{c}</Code>
              </span>
            ))}{" "}
            were copied aside and then removed, so K-Means only ever sees the six spectral features.
          </li>
        </ul>
      </WhatHappened>

      <Split
        narrative={
          <Narrative title="Six input features">
            <p>
              Four Sentinel-2 reflectance bands and two normalised indices — everything K-Means is given. Pixel
              coordinates are deliberately left out, so clusters describe what a surface looks like rather than
              where it is.
            </p>
          </Narrative>
        }
      >
        <DataTable
          rows={ds.features}
          pageSize={10}
          columns={[
            { key: "name", label: "Feature", format: (v) => <span className="font-mono font-medium text-navy">{v}</span>, sortable: false },
            { key: "band", label: "Sentinel-2 source", sortable: false },
            { key: "detail", label: "Detail", sortable: false },
            { key: "kind", label: "Type", sortable: false },
          ]}
        />
      </Split>

      <Split
        reverse
        narrative={
          <Narrative title="Reference labels, kept aside">
            <p>
              Threshold labels (NDSI &gt; 0.4 → Glacier; NDSI and NDWI &gt; 0.4 → Glacial Lake) travel with the data
              but are used only after clustering, to name and score the clusters.
            </p>
            <p>
              Lake points are only about <strong>1 in 50</strong> — a key fact for the interpretation and evaluation
              stages.
            </p>
          </Narrative>
        }
      >
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <p className="mb-4 font-mono text-[12px] text-faint">Points per date</p>
            <DataTable
              rows={perDate}
              pageSize={9}
              columns={[
                { key: "date", label: "Date", format: (v) => formatDate(v) },
                { key: "points", label: "Points", align: "right", format: (v) => formatInt(v) },
                {
                  key: "dropped",
                  label: "Dropped",
                  align: "right",
                  format: (v) => (v > 0 ? <span className="text-coral-ink">{v}</span> : <span className="text-faint">0</span>),
                },
              ]}
            />
            <p className="mt-3 text-[13px] text-faint">
              Dropped = rows short of the full {formatInt(fullGrid)}-point sampling grid (missing feature values).
            </p>
          </div>
          <div>
            <p className="mb-4 font-mono text-[12px] text-faint">Reference label composition</p>
            <ShareBar parts={ds.reference_composition} />
            <ul className="mt-6 space-y-4">
              {ds.reference_composition.map((c) => (
                <li key={c.class} className="flex items-baseline justify-between gap-3 border-b border-silver/70 pb-3">
                  <span className="text-[15px] font-semibold text-ink">
                    <ClassName name={c.class} />
                  </span>
                  <span className="tabular font-mono text-[13px] text-muted">
                    {formatInt(c.points)} <span className="ml-2 text-[18px] text-navy">{formatPct(c.share, 2)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Split>

      <Note title="Sample rows">
        The executed notebook does not print individual feature rows, so raw sample values can only be shown if the
        original CSVs are supplied for a rerun. Cluster-level feature means appear in the clustering stage.
      </Note>

      <WhyPerformed>
        Pooling all nine dates into one table means K-Means is fitted once, so a cluster number means the same surface
        type on every date and results can be compared through time. Removing the label columns keeps the experiment
        truly unsupervised; pixel coordinates (X, Y) are also excluded so that clusters reflect what a surface looks
        like, not where it is.
      </WhyPerformed>
    </>
  );
}
