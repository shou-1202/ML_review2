import { useState } from "react";
import LineChart from "../charts/LineChart";
import { Narrative, Readout, Section, Split, StatGrid, WhatHappened, WhyPerformed } from "../StageDetails";
import { classColor } from "../../utils/classes";
import { formatInt, formatNum, formatPct } from "../../utils/format";

const BANDS = ["Blue", "Green", "Red", "NIR"];
const INDICES = [
  ["NDSI_Value", "NDSI"],
  ["NDWI_Value", "NDWI"],
];

/** Horizontal bars on a −1…1 axis for one index, one bar per cluster. */
function IndexBars({ clusters, feature, label, selectedId }) {
  return (
    <div>
      <p className="mb-3 font-serif text-[20px] font-medium text-ink">{label} centroid</p>
      <div className="space-y-2.5">
        {clusters.map((c) => {
          const v = c.means[feature];
          const pct = Math.abs(v) * 50;
          const active = c.id === selectedId;
          return (
            <div key={c.id} className={`flex items-center gap-3 transition-opacity ${active ? "" : "opacity-40"}`}>
              <span className="w-[74px] shrink-0 whitespace-nowrap font-mono text-[12px] text-muted">Cluster {c.id}</span>
              <div className="relative h-3 flex-1 bg-raised">
                <span className="absolute left-1/2 top-[-4px] h-[20px] w-px bg-navy/50" aria-hidden="true" />
                <span
                  className="absolute top-0 h-full"
                  style={{ left: v >= 0 ? "50%" : `${50 - pct}%`, width: `${pct}%`, backgroundColor: classColor(c.assigned_class) }}
                />
              </div>
              <span className={`tabular w-16 text-right font-mono text-[13px] ${active ? "text-navy" : "text-muted"}`}>
                {formatNum(v, 3)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="ml-[86px] mr-[76px] mt-1.5 flex justify-between font-mono text-[10.5px] text-faint">
        <span>−1</span>
        <span>0</span>
        <span>+1</span>
      </div>
    </div>
  );
}

export default function ClusteringStep({ data }) {
  const s = data.settings;
  const clusters = data.clusters;
  const [selectedId, setSelectedId] = useState(clusters[1]?.id ?? clusters[0].id);
  const sel = clusters.find((c) => c.id === selectedId);

  const spectral = BANDS.map((b) => ({ label: b, ...Object.fromEntries(clusters.map((c) => [`c${c.id}`, c.means[b]])) }));
  const reflect = BANDS.map((b) => sel.means[b] / 10000);

  const algorithm = [
    ["Initialise", `${s.n_clusters} starting centroids are chosen with k-means++, which spreads them far apart.`],
    ["Assign", "Every pixel is assigned to its nearest centroid — Euclidean distance in the scaled feature space."],
    ["Update", "Each centroid moves to the mean of the pixels assigned to it."],
    [
      "Repeat",
      `Assign and update alternate until the centroids stop moving (tolerance ${s.tol}) or ${s.max_iter} iterations pass. The whole run is repeated ${s.n_init} times and the lowest-inertia result is kept.`,
    ],
  ];

  return (
    <>
      <StatGrid
        items={[
          ["Clusters (K)", s.n_clusters, "amber"],
          ["Initialisation", s.init],
          ["Restarts (n_init)", s.n_init],
          ["Max iterations", s.max_iter],
          ["Random state", s.random_state],
          ["Points clustered", formatInt(data.dataset.total_points)],
        ]}
      />

      <WhatHappened>
        <p>
          The final model, <strong className="font-mono text-[14px]">KMeans(n_clusters={s.n_clusters}, n_init={s.n_init}, random_state={s.random_state})</strong>,
          was fitted on every standardised point. max_iter = {s.max_iter} and tol = {s.tol} are scikit-learn's defaults; the
          notebook does not override them.
        </p>
      </WhatHappened>

      <Section title="How K-Means iterates">
        <ol className="grid gap-px bg-silver sm:grid-cols-2 xl:grid-cols-4">
          {algorithm.map(([name, text], i) => (
            <li key={name} className="bg-snow p-6 pl-0 sm:pl-6 sm:first:pl-0 xl:pl-6 xl:first:pl-0">
              <p className="font-serif text-[56px] font-medium leading-none text-cyan">{i + 1}</p>
              <p className="mt-3 text-[13px] font-bold uppercase tracking-[0.14em] text-navy">{name}</p>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="The three resulting clusters" hint="Select a cluster to inspect its centroid">
        <div className="grid gap-3 sm:grid-cols-3" role="group" aria-label="Clusters">
          {clusters.map((c) => {
            const active = c.id === selectedId;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                aria-pressed={active}
                className={`group relative overflow-hidden px-5 pb-5 pt-6 text-left transition-colors ${
                  active ? "bg-navy text-white shadow-lift" : "bg-surface text-ink shadow-panel hover:bg-frost/60"
                }`}
              >
                <span className="absolute inset-x-0 top-0 h-1.5" style={{ backgroundColor: classColor(c.assigned_class) }} />
                <span className={`block font-mono text-[12px] ${active ? "text-ice" : "text-faint"}`}>Cluster {c.id}</span>
                <span className="mt-2 block font-serif text-[40px] font-medium leading-none">{formatPct(c.share, 1)}</span>
                <span className={`tabular mt-2 block text-[13px] ${active ? "text-white/70" : "text-muted"}`}>
                  {formatInt(c.points)} points
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Split
        narrative={
          <Readout>
            <p className="font-mono text-[12px] text-faint">Selected centroid</p>
            <p className="mt-1 font-serif text-[30px] font-medium leading-tight text-navy">Cluster {sel.id}</p>
            <dl className="tabular mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 font-mono text-[13px]">
              {Object.entries(sel.means).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-faint">{k.replace("_Value", "")}</dt>
                  <dd className="text-[15px] text-ink">{k.includes("_Value") ? formatNum(v, 4) : formatNum(v, 1)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[14.5px] leading-relaxed text-muted">
              Reflectance {formatNum(Math.min(...reflect), 2)}–{formatNum(Math.max(...reflect), 2)} across Blue–NIR, NDSI{" "}
              {formatNum(sel.means.NDSI_Value, 3)}, NDWI {formatNum(sel.means.NDWI_Value, 3)}. {formatInt(sel.points)} points (
              {formatPct(sel.share, 1)}). What this cluster contains is examined in the next stage.
            </p>
          </Readout>
        }
      >
        <div className="grid gap-12 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <figure>
            <figcaption className="mb-3">
              <p className="font-serif text-[22px] font-medium text-ink">Centroid reflectance by band</p>
              <p className="text-[13px] text-muted">Mean value × 10,000 — the selected cluster in full colour</p>
            </figcaption>
            <LineChart
              data={spectral}
              series={clusters.map((c) => ({
                key: `c${c.id}`,
                label: `Cluster ${c.id}`,
                color: classColor(c.assigned_class),
                faded: c.id !== selectedId,
              }))}
              height={300}
              zeroBased
              endLabels
              legend={false}
              yFormat={(v) => formatInt(v)}
              ariaLabel="Mean reflectance per band for each cluster"
            />
          </figure>
          <div className="space-y-8">
            {INDICES.map(([f, l]) => (
              <IndexBars key={f} clusters={clusters} feature={f} label={l} selectedId={selectedId} />
            ))}
          </div>
        </div>
      </Split>

      <WhyPerformed>
        K-Means describes each group by a single centroid whose band values can be read physically, so the clusters can
        be interpreted afterwards. k-means++ seeding makes convergence faster and more reliable, restarting {s.n_init} times
        guards against a poor starting position, and a fixed random state makes every run give identical clusters.
      </WhyPerformed>
    </>
  );
}
