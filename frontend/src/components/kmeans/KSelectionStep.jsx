import { useState } from "react";
import LineChart from "../charts/LineChart";
import DataTable from "../DataTable";
import {
  Formula,
  Narrative,
  Note,
  NotebookFigure,
  Readout,
  Section,
  Split,
  StatGrid,
  WhatHappened,
  WhyPerformed,
} from "../StageDetails";
import { formatInt, formatNum, formatPct } from "../../utils/format";

const LINE = "#1B5583";

function KChart({ title, hint, rows, metric, format, selectedK, inspectK, onInspect }) {
  const data = rows.map((r) => ({ label: String(r.k), [metric]: r[metric] }));
  const idx = rows.findIndex((r) => r.k === selectedK);
  return (
    <figure>
      <figcaption className="mb-3">
        <p className="font-serif text-[22px] font-medium leading-tight text-ink">{title}</p>
        <p className="text-[13px] text-muted">{hint}</p>
      </figcaption>
      <LineChart
        data={data}
        series={[{ key: metric, label: title, color: LINE }]}
        height={230}
        yFormat={format}
        tooltipFormat={(v) => (metric === "inertia" ? formatInt(v) : formatNum(v, 4))}
        highlightIndex={idx}
        highlightLabel={`k = ${selectedK}`}
        selectedIndex={rows.findIndex((r) => r.k === inspectK)}
        onSelectIndex={(i) => onInspect(rows[i].k)}
        ariaLabel={`${title} for k = 2 to 8`}
      />
      <p className="mt-1 text-center font-mono text-[11px] text-faint">number of clusters, k</p>
    </figure>
  );
}

export default function KSelectionStep({ data }) {
  const ks = data.k_selection;
  const s = data.settings;
  const [inspectK, setInspectK] = useState(ks.selected_k);
  const rows = ks.rows;
  const row = (k) => rows.find((r) => r.k === k);
  const sel = row(ks.selected_k);
  const insp = row(inspectK);
  const mark = (k, best) => (k === best ? <span className="ml-1.5 font-sans text-[11px] font-semibold text-cyan-ink">best</span> : null);

  return (
    <>
      <StatGrid
        items={[
          ["k values tested", `${rows[0].k}–${rows[rows.length - 1].k}`],
          ["Fit sample", formatInt(ks.fit_sample)],
          ["Score sample", formatInt(ks.score_sample)],
        ]}
      />

      <WhatHappened>
        <p>
          All six features were standardised with <strong>StandardScaler</strong>, fitted on all{" "}
          {formatInt(data.dataset.total_points)} points. Then K-Means was fitted for every k from {rows[0].k} to{" "}
          {rows[rows.length - 1].k} on a random sample of {formatInt(ks.fit_sample)} points (random state {s.random_state}),
          and the first {formatInt(ks.score_sample)} of them were used for the silhouette and Davies–Bouldin scores.
        </p>
      </WhatHappened>

      <Split
        narrative={
          <Narrative title="Putting every feature on one scale">
            <p>
              Reflectance bands run from about 0 to 10,000 while NDSI and NDWI run from −1 to +1. K-Means uses Euclidean
              distance, so without scaling a 0.5 change in NDSI would count for almost nothing next to a 500 change in
              Blue.
            </p>
          </Narrative>
        }
      >
        <Formula caption="x = original value · μ = feature mean · σ = feature standard deviation (over all points). After scaling every feature has mean 0 and standard deviation 1.">
          z = (x − μ) / σ
        </Formula>
      </Split>

      <Section title="Choosing k" hint="Click any point, or a table row, to inspect that k">
        <div className="grid gap-12 xl:grid-cols-3">
          <KChart
            title="Inertia"
            hint="Look for the bend (elbow)"
            rows={rows}
            metric="inertia"
            format={(v) => `${Math.round(v / 1000)}k`}
            selectedK={ks.selected_k}
            inspectK={inspectK}
            onInspect={setInspectK}
          />
          <KChart
            title="Silhouette score"
            hint={`Higher is better — best at k = ${ks.best_silhouette_k}`}
            rows={rows}
            metric="silhouette"
            format={(v) => v.toFixed(2)}
            selectedK={ks.selected_k}
            inspectK={inspectK}
            onInspect={setInspectK}
          />
          <KChart
            title="Davies–Bouldin index"
            hint={`Lower is better — best at k = ${ks.best_davies_bouldin_k}`}
            rows={rows}
            metric="davies_bouldin"
            format={(v) => v.toFixed(2)}
            selectedK={ks.selected_k}
            inspectK={inspectK}
            onInspect={setInspectK}
          />
        </div>
      </Section>

      <Split
        narrative={
          <Readout>
            <p className="font-mono text-[12px] text-faint">Inspecting</p>
            <p className="mt-1 font-serif text-[40px] font-medium leading-none text-navy">
              k = {inspectK}
              {inspectK === ks.selected_k && <span className="ml-3 align-middle font-mono text-[12px] text-coral-ink">selected</span>}
            </p>
            <dl className="tabular mt-4 space-y-1.5 font-mono text-[13.5px]">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Inertia</dt>
                <dd className="text-ink">{formatInt(insp.inertia)}</dd>
              </div>
              {insp.inertia_drop_pct !== null && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Drop vs k = {inspectK - 1}</dt>
                  <dd className="text-ink">−{formatPct(insp.inertia_drop_pct, 1)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Silhouette</dt>
                <dd className="text-ink">{formatNum(insp.silhouette, 4)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Davies–Bouldin</dt>
                <dd className="text-ink">{formatNum(insp.davies_bouldin, 4)}</dd>
              </div>
            </dl>
          </Readout>
        }
      >
        <DataTable
          rows={rows}
          pageSize={10}
          isHighlighted={(r) => r.k === inspectK}
          onRowClick={(r) => setInspectK(r.k)}
          columns={[
            { key: "k", label: "k", format: (v) => (v === ks.selected_k ? `${v} (selected)` : v) },
            { key: "inertia", label: "Inertia", align: "right", format: (v) => formatInt(v) },
            {
              key: "inertia_drop_pct",
              label: "Drop vs k−1",
              align: "right",
              format: (v, r) =>
                v === null ? "—" : (
                  <>
                    {formatPct(v, 1)}
                    {mark(r.k, ks.largest_inertia_drop_k)}
                  </>
                ),
            },
            {
              key: "silhouette",
              label: "Silhouette ↑",
              align: "right",
              format: (v, r) => (
                <>
                  {formatNum(v, 4)}
                  {mark(r.k, ks.best_silhouette_k)}
                </>
              ),
            },
            {
              key: "davies_bouldin",
              label: "Davies–Bouldin ↓",
              align: "right",
              format: (v, r) => (
                <>
                  {formatNum(v, 4)}
                  {mark(r.k, ks.best_davies_bouldin_k)}
                </>
              ),
            },
          ]}
        />
      </Split>

      <Note title={`Why k = ${ks.selected_k} was kept`}>
        The elbow supports k = {ks.selected_k}: inertia falls by {formatPct(sel.inertia_drop_pct, 1)} from k ={" "}
        {ks.selected_k - 1}, the largest single improvement. The other two measures do not: the silhouette score is highest
        at k = {ks.best_silhouette_k} ({formatNum(row(ks.best_silhouette_k).silhouette, 4)} vs {formatNum(sel.silhouette, 4)}),
        and the Davies–Bouldin index is best at k = {ks.best_davies_bouldin_k} (
        {formatNum(row(ks.best_davies_bouldin_k).davies_bouldin, 4)} vs {formatNum(sel.davies_bouldin, 4)}). The data's
        natural structure is two groups (snow-and-ice vs land) or four. k = {ks.selected_k} was retained because the goal is
        to match the three target classes — Glacier, Glacial Lake and Non-Glacier Land — and its weaker Davies–Bouldin score
        already hints that one cluster will overlap the others (interpretation stage).
      </Note>

      <div>
        <NotebookFigure figure={data.figures.k_selection} />
        <WhyPerformed>
          K-Means needs the number of clusters in advance. Inertia always falls as k grows, so it is read for its bend;
          the silhouette score rewards compact, well-separated clusters; Davies–Bouldin penalises overlapping ones.
          Scoring on a sample keeps the silhouette computation (which compares every pair of points) fast, while the final
          model is fitted on every point.
        </WhyPerformed>
      </div>
    </>
  );
}
