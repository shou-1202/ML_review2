import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import LineChart from "../charts/LineChart";
import DataTable from "../DataTable";
import { ChoiceGroup, ClassName, Note, Section, Split, StatGrid, WhatHappened, WhyPerformed } from "../StageDetails";
import { classColor } from "../../utils/classes";
import { formatDate, formatNum, formatPct } from "../../utils/format";
import { AREA_VIEWS } from "./AreaStep";

export default function ForecastStep({ data }) {
  const f = data.forecast;
  const a = f.anomaly;
  const names = data.classes.map((c) => c.name);
  const observed = data.areas.series;
  const lastObs = observed[observed.length - 1];
  const end = f.series[f.series.length - 1];
  const [view, setView] = useState("all");
  const hidden = view === "all" ? [] : names.filter((n) => n !== view).flatMap((n) => [n, `${n} (forecast)`]);

  // observed values, then forecast values; the baseline date carries both so the lines join
  const rows = [
    ...observed.map((r, i) => ({
      label: r.label,
      ...Object.fromEntries(names.map((n) => [n, r[n]])),
      ...(i === observed.length - 1 ? Object.fromEntries(names.map((n) => [`${n} (forecast)`, r[n]])) : {}),
      note: r.date === a.date ? "Lake classification anomaly" : i === observed.length - 1 ? "Forecast baseline" : "Observed",
      noteTone: r.date === a.date ? "warn" : undefined,
    })),
    ...f.series.map((r) => ({
      label: r.label,
      ...Object.fromEntries(names.map((n) => [`${n} (forecast)`, r[n]])),
      note: "Projection — not observed",
    })),
  ];

  const lakeStart = lastObs["Glacial Lake"];
  const lakeEnd = end["Glacial Lake"];

  return (
    <>
      <StatGrid
        items={[
          [`Glacier, ${formatDate(end.date, { year: false })}`, `${formatNum(end.Glacier, 2)} km²`, "amber"],
          [`Glacial Lake, ${formatDate(end.date, { year: false })}`, `${formatNum(end["Glacial Lake"], 2)} km²`],
          [`Land, ${formatDate(end.date, { year: false })}`, `${formatNum(end["Non-Glacier Land"], 2)} km²`],
        ]}
      />

      <WhatHappened>
        <p>
          Starting from the classified areas on {formatDate(f.base_date)}, the notebook applied A(t+1) = A(t) × P {f.steps} times —
          one {data.settings.step_days}-day step each — reaching {formatDate(end.date)}. It also solved for the steady state: the
          distribution that P no longer changes.
        </p>
      </WhatHappened>

      <Section title="Observed and forecast class area">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-muted">Solid = classified maps · dashed, shaded = Markov projection</p>
          <ChoiceGroup label="Chart view" size="sm" value={view} onChange={setView} options={AREA_VIEWS} />
        </div>
        <LineChart
          key={view}
          data={rows}
          series={names.flatMap((n) => [
            { key: n, label: `${n} — observed`, color: classColor(n), endLabel: false },
            { key: `${n} (forecast)`, label: `${n} — forecast`, color: classColor(n), dashed: true, endLabel: n },
          ])}
          initiallyHidden={hidden}
          height={420}
          zeroBased={view === "all"}
          yTitle="Area (km²)"
          yFormat={(x) => (view === "Glacial Lake" ? x.toFixed(2) : x.toFixed(0))}
          tooltipFormat={(x) => `${formatNum(x, 3)} km²`}
          shadeFrom={observed.length - 1}
          shadeLabel="projection →"
          vlines={[{ index: observed.length - 1 }]}
          endLabels
          ariaLabel="Observed class areas and six-step Markov forecast"
        />
      </Section>

      <Note title="A projection, not a live prediction">
        The forecast runs the Nov–Dec transition rates forward from the {formatDate(f.base_date)} baseline. It uses no imagery
        after that date and assumes the same {data.settings.step_days}-day rates continue — which will not hold across seasons, as
        new snowfall later in winter can reverse the trend. In this projection Glacier loss slows from{" "}
        {formatNum(lastObs.Glacier - f.series[0].Glacier, 2)} to {formatNum(f.series[f.series.length - 2].Glacier - end.Glacier, 2)}{" "}
        km² per step as the remaining snow shrinks.
      </Note>

      <Split
        narrative={
          <div className="lg:sticky lg:top-44">
            <h3 className="font-serif text-[30px] font-medium leading-[1.1] text-ink">Long-run steady state</h3>
            <p className="prose-panel mt-3">Where the areas would settle if the same rates continued indefinitely.</p>
            <ul className="mt-6 space-y-4">
              {f.steady_state.map((s) => (
                <li key={s.class} className="border-b border-silver/70 pb-3">
                  <span className="text-[14px] font-semibold text-ink">
                    <ClassName name={s.class} />
                  </span>
                  <p className="tabular mt-1 font-mono text-[22px] text-navy">
                    {formatNum(s.km2, 2)} km² <span className="text-[14px] text-muted">{formatPct(s.share_pct, 1)}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        }
      >
        <p className="mb-4 font-mono text-[12px] text-faint">Forecast, km²</p>
        <DataTable
          rows={f.series}
          pageSize={10}
          columns={[
            { key: "date", label: "Date", format: (x) => formatDate(x) },
            ...names.map((n) => ({ key: n, label: n, align: "right", format: (x) => formatNum(x, 3) })),
          ]}
        />
      </Split>

      {/* the 14 December anomaly — warning panel */}
      <section className="relative overflow-hidden border-l-[4px] border-coral bg-coral-soft/80 px-6 py-8 sm:px-10">
        <span
          aria-hidden="true"
          className="absolute inset-y-0 right-0 hidden w-20 opacity-[0.16] sm:block"
          style={{ backgroundImage: "repeating-linear-gradient(135deg, #FF694F 0 8px, transparent 8px 18px)" }}
        />
        <div className="relative grid gap-8 sm:pr-20 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="flex items-center gap-2 font-mono text-[12.5px] text-coral-ink">
              <AlertTriangle className="h-4 w-4" /> Classification anomaly
            </p>
            <h3 className="mt-2 font-serif text-[34px] font-semibold leading-[1.05] text-coral-ink">
              {formatDate(a.date)}: lake pixels mapped as glacier
            </h3>
            <p className="tabular mt-4 font-mono text-[44px] leading-none text-navy">
              {formatNum(a.lake_area_km2, 2)}
              <span className="ml-1 text-[18px] text-muted">km²</span>
            </p>
            <p className="mt-1 text-[13.5px] text-muted">
              lake area that day, vs {formatNum(Math.min(...a.lake_area_other_dates_km2), 2)}–
              {formatNum(Math.max(...a.lake_area_other_dates_km2), 2)} km² on every other date
            </p>
          </div>
          <div className="space-y-3 text-[15.5px] leading-relaxed text-muted lg:col-span-8">
            <p>
              In the {a.period_label} interval <strong className="text-ink">{formatPct(a.lake_to_glacier * 100, 1)}</strong> of lake pixels
              were labelled Glacier — most likely ice or fresh snow on the lake, or a classification error.
            </p>
            <p>
              That single interval gives the pooled matrix its Lake → Glacier probability of{" "}
              <strong className="tabular text-ink">{formatNum(a.pooled_lake_to_glacier, 4)}</strong>; in the other intervals it is{" "}
              {formatNum(a.lake_to_glacier_other_periods[0], 3)}–{formatNum(a.lake_to_glacier_other_periods[1], 3)}. Without it, pooled
              lake persistence would be about <strong className="tabular text-ink">{formatNum(a.pooled_lake_persistence_without_period, 2)}</strong>{" "}
              instead of {formatNum(a.pooled_lake_persistence, 4)}.
            </p>
            <p>
              This is why the forecast and steady state show the lake shrinking ({formatNum(lakeStart, 3)} → {formatNum(lakeEnd, 3)} km²)
              — an artefact of one map, not a real trend.
            </p>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-midnight px-8 py-14 text-white shadow-lift sm:px-14">
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: classColor("Glacial Lake", "dark") }} />
        <p className="font-mono text-[12.5px] text-cyan">Conclusion</p>
        <p className="mt-5 max-w-4xl font-serif text-[clamp(1.75rem,2.8vw,2.75rem)] font-medium leading-[1.14]">
          The Markov chain captures the temporal transition patterns across the observation period. The mapped snow-and-ice class
          decreases, while the lake remains relatively stable. The model's lake forecast is affected by an unusual classification
          event on 14 December.
        </p>
        <p className="mt-7 max-w-3xl text-[15.5px] leading-relaxed text-white/65">
          The Glacier class here is snow and ice together, so the 40-day decline is mostly seasonal snow-cover change on lower
          slopes — not glacier retreat, which takes years to measure.
        </p>
      </section>

      <WhyPerformed>
        Running the validated chain forward turns the observed transition rates into an explicit expectation for the coming
        weeks and a long-run end state. Comparing that projection with future classified maps is the natural next test of the
        model.
      </WhyPerformed>
    </>
  );
}
