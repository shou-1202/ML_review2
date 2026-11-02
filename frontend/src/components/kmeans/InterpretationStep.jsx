import { useState } from "react";
import DataTable from "../DataTable";
import { ClassName, Narrative, Note, Readout, Section, Split, WhatHappened, WhyPerformed } from "../StageDetails";
import { classColor, classShort } from "../../utils/classes";
import { formatInt, formatNum, formatPct } from "../../utils/format";

const MIXED = "Intermediate / Mixed Reflectance";

function CompositionBar({ composition, height = "h-3" }) {
  return (
    <div className={`flex ${height} w-full overflow-hidden`}>
      {composition.map((p) =>
        p.share > 0 ? (
          <div
            key={p.class}
            title={`${p.class}: ${formatPct(p.share, 1)}`}
            className="h-full border-r-2 border-white/80 last:border-r-0"
            style={{ width: `${p.share}%`, backgroundColor: classColor(p.class), minWidth: 3 }}
          />
        ) : null
      )}
    </div>
  );
}

/** Plain-language reading of a cluster, driven by its own numbers. */
function Reading({ c, maxBrightness }) {
  const refl = ["Blue", "Green", "Red", "NIR"].map((b) => c.means[b] / 10000);
  const lo = formatNum(Math.min(...refl), 2);
  const hi = formatNum(Math.max(...refl), 2);
  const bright = Math.max(...refl) === maxBrightness;

  if (c.interpretation === MIXED) {
    return (
      <p>
        Intermediate brightness (reflectance about {lo}–{hi}) with a moderate NDSI ({formatNum(c.means.NDSI_Value, 3)}) and a
        low NDWI ({formatNum(c.means.NDWI_Value, 3)}). This is the group of surfaces that are neither fully bright nor fully
        dark: snow and ice in topographic shadow, debris-covered or dirty ice, thin snow over rock, mixed pixels at glacier
        edges — and the frozen or snow-covered lake surface.
      </p>
    );
  }
  if (bright) {
    return (
      <p>
        Extremely bright in every band (reflectance about {lo}–{hi}) with the highest NDSI ({formatNum(c.means.NDSI_Value, 3)}):
        clean, sunlit snow and ice. It is {formatPct(c.assigned_class_purity, 2)} {c.assigned_class} in the reference.
      </p>
    );
  }
  return (
    <p>
      Dark in the visible bands (reflectance about {lo}–{hi}) with strongly negative NDSI ({formatNum(c.means.NDSI_Value, 3)})
      and NDWI ({formatNum(c.means.NDWI_Value, 3)}): bare rock, moraine, soil and sparse vegetation. It is{" "}
      {formatPct(c.assigned_class_purity, 3)} {c.assigned_class} in the reference — found without any labels.
    </p>
  );
}

export default function InterpretationStep({ data }) {
  const clusters = data.clusters;
  const naming = data.naming;
  const mixed = clusters.find((c) => c.interpretation === MIXED);
  const [selectedId, setSelectedId] = useState(mixed ? mixed.id : clusters[0].id);
  const sel = clusters.find((c) => c.id === selectedId);
  const maxBrightness = Math.max(...clusters.map((c) => Math.max(c.means.Blue, c.means.Green, c.means.Red, c.means.NIR) / 10000));
  const best = naming.options[0];
  const runnerUp = naming.options[1];
  const classes = naming.crosstab.columns;
  const mapping = (m) =>
    Object.entries(m)
      .map(([k, v]) => `${k}→${classShort(v)}`)
      .join("  ");

  return (
    <>
      <WhatHappened>
        <p>
          K-Means only returns cluster numbers. To read them, the notebook cross-tabulated each cluster against the
          reference labels set aside in the data stage, then used the <strong>Hungarian algorithm</strong> to pick the
          one-to-one cluster → class naming that matches the most points. The labels are used only to <em>name</em>{" "}
          clusters that already exist; they cannot change which points were grouped together.
        </p>
      </WhatHappened>

      <Section title="What each cluster contains" hint="Select a cluster">
        <div className="grid gap-3 lg:grid-cols-3" role="group" aria-label="Clusters">
          {clusters.map((c) => {
            const active = c.id === selectedId;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                aria-pressed={active}
                className={`flex flex-col gap-4 px-6 py-6 text-left transition-colors ${
                  active ? "bg-navy text-white shadow-lift" : "bg-surface text-ink shadow-panel hover:bg-frost/60"
                }`}
              >
                <span className={`font-mono text-[12px] ${active ? "text-ice" : "text-faint"}`}>Cluster {c.id}</span>
                <span className="font-serif text-[30px] font-medium leading-[1.05]">
                  {c.interpretation === MIXED ? "Intermediate / Mixed Reflectance" : c.interpretation}
                </span>
                <CompositionBar composition={c.composition} />
                <span className={`tabular text-[13px] ${active ? "text-white/75" : "text-muted"}`}>
                  {c.interpretation === MIXED
                    ? c.composition.map((p) => `${formatPct(p.share, 1)} ${classShort(p.class)}`).join(" · ")
                    : `${formatPct(c.assigned_class_purity, c.assigned_class_purity > 99.99 ? 3 : 2)} ${classShort(c.assigned_class)}`}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Split
        narrative={
          <Readout>
            <p className="font-mono text-[12px] text-faint">Hungarian name: “{sel.assigned_class}”</p>
            <p className="mt-1 font-serif text-[28px] font-medium leading-tight text-navy">
              Cluster {sel.id} – {sel.interpretation}
            </p>
            <div className="mt-3 text-[14.5px] leading-relaxed text-muted">
              <Reading c={sel} maxBrightness={maxBrightness} />
            </div>
          </Readout>
        }
      >
        <table className="w-full border-t-2 border-navy text-[15px]">
          <thead>
            <tr className="border-b border-silver text-left font-mono text-[12px] text-faint">
              <th className="py-3 font-normal">Reference class</th>
              <th className="py-3 text-right font-normal">Points</th>
              <th className="w-1/2 py-3 pl-6 font-normal">Share of cluster {sel.id}</th>
            </tr>
          </thead>
          <tbody>
            {sel.composition.map((p) => (
              <tr key={p.class} className="border-b border-silver/70">
                <td className="py-4 font-semibold text-ink">
                  <ClassName name={p.class} />
                </td>
                <td className="tabular py-4 text-right font-mono text-[14px] text-ink">{formatInt(p.points)}</td>
                <td className="py-4 pl-6">
                  <div className="flex items-center gap-3">
                    <div className="h-3 flex-1 bg-raised">
                      <div className="h-full" style={{ width: `${p.share}%`, backgroundColor: classColor(p.class) }} />
                    </div>
                    <span className="tabular w-16 text-right font-mono text-[15px] text-navy">{formatPct(p.share, 1)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Split>

      {mixed && (
        <Note tone="warn" title={`Cluster ${mixed.id} is not a lake cluster`}>
          It holds {mixed.composition.map((p) => `${formatPct(p.share, 1)} ${p.class}`).join(", ")} reference points. It received
          the name “{mixed.assigned_class}” only because, once the other clusters took{" "}
          {clusters
            .filter((c) => c.id !== mixed.id)
            .map((c) => `“${c.assigned_class}”`)
            .join(" and ")}
          , one-to-one matching had no other class left to give it. Its mean NDWI of {formatNum(mixed.means.NDWI_Value, 2)} is
          far below the 0.4 threshold that defines a reference lake point. It is best described as an intermediate- or
          mixed-reflectance cluster.
        </Note>
      )}

      <Split
        narrative={
          <Narrative title="Hungarian matching">
            <p>Every possible one-to-one naming, ranked by how many points it matches.</p>
            {runnerUp && (
              <p>
                The chosen naming matches <strong className="tabular">{formatInt(best.matched_points)}</strong> points; the
                next best ({mapping(runnerUp.mapping)}) matches {formatInt(runnerUp.matched_points)}.
              </p>
            )}
          </Narrative>
        }
      >
        <DataTable
          rows={naming.options.map((o, i) => ({ rank: i + 1, ...o }))}
          pageSize={6}
          isHighlighted={(r) => r.selected}
          columns={[
            { key: "mapping", label: "Naming (cluster → class)", sortable: false, format: (m) => <span className="font-mono text-[13px]">{mapping(m)}</span> },
            { key: "matched_points", label: "Matched points", align: "right", format: (v) => formatInt(v) },
            { key: "selected", label: "", sortable: false, format: (v) => (v ? <span className="text-[12px] font-semibold text-coral-ink">chosen</span> : "") },
          ]}
        />
      </Split>

      <Split
        reverse
        narrative={
          <Narrative title="Cluster × reference cross-table">
            <p>Point counts over all nine dates — the table the naming and every agreement score are built from.</p>
          </Narrative>
        }
      >
        <DataTable
          rows={naming.crosstab.rows}
          pageSize={10}
          columns={[
            { key: "cluster", label: "Cluster", format: (v) => `Cluster ${v}` },
            ...classes.map((c) => ({ key: c, label: c, align: "right", format: (v) => formatInt(v) })),
          ]}
        />
      </Split>

      <WhyPerformed>
        Cluster numbers carry no meaning — on another run cluster 0 could just as well be glacier. Naming them against
        the reference makes the evaluation possible, and reading each cluster's composition shows whether the name is
        deserved. Here it is for two clusters and not for the third.
      </WhyPerformed>
    </>
  );
}
