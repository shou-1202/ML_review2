import { useState } from "react";
import LineChart from "../charts/LineChart";
import MapGallery from "../MapGallery";
import { Narrative, NotebookFigure, Section, Split, WhatHappened, WhyPerformed } from "../StageDetails";
import { classColor } from "../../utils/classes";
import { formatDate, formatInt, formatNum, formatPct } from "../../utils/format";

function DateMetrics({ d, overall }) {
  const m = d.metrics;
  const rows = m
    ? [
        ["Agreement", formatPct(m.oa, 2), m.oa - overall.oa],
        ["Kappa", formatNum(m.kappa, 3)],
        ["Macro F1", formatNum(m.macro_f1, 3)],
        ["ARI", formatNum(m.ari, 3)],
        ["NMI", formatNum(m.nmi, 3)],
      ]
    : [];
  return (
    <div className="lg:border-l lg:border-white/10 lg:pl-8">
      <p className="font-serif text-[30px] font-medium leading-tight text-white">{formatDate(d.date)}</p>
      <p className="mt-1 font-mono text-[12px] text-white/50">{formatInt(d.points)} sample points</p>
      <dl className="mt-6 space-y-3">
        {rows.map(([k, v, delta]) => (
          <div key={k} className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-2">
            <dt className="text-[13.5px] text-white/60">{k}</dt>
            <dd className="tabular font-mono text-[16px] text-white">
              {v}
              {delta !== undefined && (
                <span className={`ml-2 text-[11.5px] ${delta < -1 ? "text-coral" : "text-white/45"}`}>
                  {delta >= 0 ? "+" : "−"}
                  {Math.abs(delta).toFixed(2)}
                </span>
              )}
            </dd>
          </div>
        ))}
        {d.decision_tree_oa !== null && d.decision_tree_oa !== undefined && (
          <div className="flex items-baseline justify-between gap-3 pt-1">
            <dt className="text-[13.5px] text-white/60">vs Decision Tree map</dt>
            <dd className="tabular font-mono text-[16px] text-white">{formatPct(d.decision_tree_oa, 2)}</dd>
          </div>
        )}
      </dl>
      <p className="mt-4 text-[12px] leading-snug text-white/45">
        Agreement delta vs the all-dates value ({formatPct(overall.oa, 2)}).
      </p>
    </div>
  );
}

export default function MapsStep({ data }) {
  const dates = data.maps.dates;
  const overall = data.evaluation.overall;
  const weakest = dates.reduce((a, b) => (b.metrics && b.metrics.oa < a.metrics.oa ? b : a), dates[0]);
  const [selected, setSelected] = useState(weakest.date);
  const sel = dates.find((d) => d.date === selected) || dates[0];
  const idx = dates.findIndex((d) => d.date === sel.date);

  const byId = Object.fromEntries(data.clusters.map((c) => [c.assigned_class, c]));
  const legendFor = (name) => {
    const c = byId[name];
    if (!c) return name;
    return c.interpretation === name ? `${name} (cluster ${c.id})` : `“${name}” — cluster ${c.id}, mixed`;
  };

  return (
    <>
      <WhatHappened>
        <p>
          The fitted scaler and K-Means model were applied to every pixel of each full Sentinel-2 scene (rebuilding the same
          six features from bands 1, 2, 3, 7 and 9), and clusters were converted to the class codes used by all the project's
          maps. The maps below are cut from the notebook's own figure, <strong className="font-mono text-[14px]">KMeans_maps_Shako.png</strong>.
        </p>
      </WhatHappened>

      <Section title="K-Means classified maps" hint="Choose a date, or use ← → on the map">
        <div className="-mx-5 sm:mx-0">
          <MapGallery
            alt="K-Means classified map"
            items={dates.map((d) => ({
              key: d.date,
              label: formatDate(d.date, { year: false }),
              imageUrl: d.image_url,
              flag: d.date === weakest.date ? "!" : undefined,
            }))}
            selectedKey={sel.date}
            onSelect={setSelected}
            legend={[
              ...["Glacier", "Glacial Lake", "Non-Glacier Land"].map((n) => ({ color: classColor(n, "map"), label: legendFor(n) })),
              { color: "#000000", label: "No data" },
            ]}
            caption={`Shako, ${formatDate(sel.date)} · ${data.maps.extent}`}
            aside={<DateMetrics d={sel} overall={overall} />}
          />
        </div>
      </Section>

      <Section title="Agreement with the reference, date by date" hint="Click a date to open its map">
        <LineChart
          data={dates.map((d) => ({
            label: formatDate(d.date, { year: false }),
            oa: d.metrics?.oa ?? null,
            dt: d.decision_tree_oa ?? null,
            note: d.date === weakest.date ? "Weakest date" : undefined,
            noteTone: "warn",
          }))}
          series={[
            { key: "oa", label: "vs reference labels", color: "#1B5583" },
            ...(dates.some((d) => d.decision_tree_oa !== null && d.decision_tree_oa !== undefined)
              ? [{ key: "dt", label: "vs Decision Tree map", color: "#D4442B", dashed: true }]
              : []),
          ]}
          height={280}
          yTitle="Overall agreement (%)"
          yFormat={(v) => `${v.toFixed(1)}`}
          tooltipFormat={(v) => formatPct(v, 2)}
          selectedIndex={idx}
          onSelectIndex={(i) => setSelected(dates[i].date)}
          endLabels
          ariaLabel="Overall agreement per date"
        />
      </Section>

      <Split
        narrative={
          <Narrative title="What to look for">
            <p>
              Brown land follows the valleys and rock slopes consistently on every date. Shako lake, the large blue body in
              the centre, is captured with a stable outline — but blue also spreads along glacier margins, the north and
              north-east, and across shaded slopes: the mixed cluster.
            </p>
            <p>
              <strong>{formatDate(weakest.date)}</strong> is the weakest date (agreement {formatPct(weakest.metrics.oa, 2)}, kappa{" "}
              {formatNum(weakest.metrics.kappa, 3)}); its map shows extra blue patches in the lower right that point to a
              scene-specific effect such as thin cloud, haze or fresh snow.
            </p>
          </Narrative>
        }
      >
        <div className="relative overflow-hidden bg-midnight px-8 py-12 text-white shadow-lift sm:px-12">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-coral" />
          <p className="font-mono text-[12.5px] text-coral">Final result</p>
          <p className="mt-4 font-serif text-[clamp(1.75rem,2.6vw,2.6rem)] font-medium leading-[1.12]">
            K-Means successfully separated dark land and bright snow/ice but struggled to identify glacial lakes as a
            separate spectral cluster.
          </p>
          <p className="mt-6 text-[16px] text-white/70">
            The result is <span className="tabular font-mono text-white">{formatPct(overall.oa, 2)}</span> agreement with the
            threshold reference labels (kappa {formatNum(overall.kappa, 3)}, macro F1 {formatNum(overall.macro_f1, 3)}).
          </p>
        </div>
      </Split>

      <div>
        <NotebookFigure figure={data.figures.maps} title="Original notebook figure — all nine maps" />
        <NotebookFigure figure={data.figures.agreement} title="Original notebook figure — agreement summary" />
        <WhyPerformed>
          Earlier stages work on sample points only. Mapping every pixel shows the clusters in space, where their meaning
          becomes visible — the stable land and bright-snow pattern, and where the mixed cluster falls. Using the same
          colours and class codes as the supervised maps lets the two be compared side by side.
        </WhyPerformed>
      </div>
    </>
  );
}
