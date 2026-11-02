import { useState } from "react";
import LineChart from "../charts/LineChart";
import MetricCard from "../MetricCard";
import { ChoiceGroup, ClassName, Narrative, Note, NotebookFigure, Section, Split, WhatHappened, WhyPerformed } from "../StageDetails";
import { classColor } from "../../utils/classes";
import { formatDate, formatNum, formatPct, formatSigned } from "../../utils/format";
import { AREA_VIEWS } from "./AreaStep";

export default function ValidationStep({ data }) {
  const v = data.validation;
  const h = v.hindcast;
  const names = data.classes.map((c) => c.name);
  const [view, setView] = useState("Glacier");
  const hidden = view === "all" ? [] : names.filter((n) => n !== view).flatMap((n) => [n, `${n} (Markov)`]);
  const ratio = v.baseline_error_pct / v.total_abs_error_pct;
  const series = data.areas.series;
  const firstStepLoss = series[0].Glacier - series[1].Glacier;
  const lakeRow = v.rows.find((r) => r.class === "Glacial Lake") || v.rows[1];

  return (
    <>
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-3">
        <MetricCard label="Markov validation error" value={formatPct(v.total_abs_error_pct, 2)} hint="Share of the study area, one step" />
        <MetricCard label="No-change baseline error" value={formatPct(v.baseline_error_pct, 2)} accent="ink" hint={`Assume ${formatDate(v.predict_date, { year: false })} = ${formatDate(v.from_date, { year: false })}`} />
        <MetricCard label={`Hindcast error over ${h.days} days`} value={formatPct(h.final_error_pct, 2)} accent="teal" hint={`P run ${series.length - 1} steps from ${formatDate(series[0].date, { year: false })}`} />
      </div>

      <WhatHappened>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            <strong>Hold-out test.</strong> P was rebuilt <em>without</em> the last interval, then run one step from the classified{" "}
            {formatDate(v.from_date)} map to predict {formatDate(v.predict_date)}. The prediction was compared with the classified{" "}
            {formatDate(v.predict_date, { year: false })} areas; the error is the share of the study area assigned to the wrong class,
            Σ|predicted − actual| / 2.
          </li>
          <li>
            <strong>Baseline.</strong> The same error for a naive “no change” guess ({formatDate(v.predict_date, { year: false })} looks
            exactly like {formatDate(v.from_date, { year: false })}): {formatPct(v.baseline_error_pct, 2)} — about {Math.round(ratio)}× the
            Markov error.
          </li>
          <li>
            <strong>Hindcast.</strong> The full P was run forward {series.length - 1} steps from the{" "}
            {formatDate(series[0].date, { year: false })} map alone and compared with every classified date.
          </li>
        </ol>
      </WhatHappened>

      <Split
        narrative={
          <Narrative title={`Actual vs predicted, ${formatDate(v.predict_date, { year: false })}`}>
            <p>
              Solid bar = classified, outlined bar = Markov prediction, scaled within each class. The lake's{" "}
              {formatSigned(lakeRow.error_pct, 1)}% miss comes from the 14 Dec anomaly inside the training matrix, not from a real trend.
            </p>
          </Narrative>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-t-2 border-navy text-[15px]">
            <thead>
              <tr className="border-b border-silver text-left font-mono text-[12px] text-faint">
                <th className="py-3 font-normal">Class</th>
                <th className="py-3 text-right font-normal">Classified km²</th>
                <th className="py-3 text-right font-normal">Markov km²</th>
                <th className="py-3 text-right font-normal">Error km²</th>
                <th className="py-3 text-right font-normal">Error %</th>
                <th className="w-[26%] py-3 pl-6 font-normal">Classified vs predicted</th>
              </tr>
            </thead>
            <tbody>
              {v.rows.map((r) => {
                const max = Math.max(r.actual_km2, r.predicted_km2);
                return (
                  <tr key={r.class} className="border-b border-silver/70">
                    <td className="py-4 font-semibold text-ink">
                      <ClassName name={r.class} />
                    </td>
                    <td className="tabular py-4 text-right font-mono text-ink">{formatNum(r.actual_km2, 3)}</td>
                    <td className="tabular py-4 text-right font-mono text-navy">{formatNum(r.predicted_km2, 3)}</td>
                    <td className="tabular py-4 text-right font-mono text-ink">{formatSigned(r.error_km2, 3)}</td>
                    <td className="tabular py-4 text-right font-mono text-muted">{formatSigned(r.error_pct, 3)}%</td>
                    <td className="py-4 pl-6">
                      <div className="space-y-1.5">
                        <div className="h-2" style={{ width: `${(100 * r.actual_km2) / max}%`, backgroundColor: classColor(r.class) }} />
                        <div className="h-2 border-2" style={{ width: `${(100 * r.predicted_km2) / max}%`, borderColor: classColor(r.class) }} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Split>

      <Section title={`Hindcast — classified vs Markov from ${formatDate(series[0].date, { year: false })}`}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-muted">Solid = classified maps · dashed = P run forward from the first map only</p>
          <ChoiceGroup label="Chart view" size="sm" value={view} onChange={setView} options={AREA_VIEWS} />
        </div>
        <LineChart
          key={view}
          data={h.series.map((r, i) => ({
            ...r,
            note: i === 0 ? "Starting state" : `Area misclassified by the model: ${formatPct(h.error_pct_by_date[i], 2)}`,
          }))}
          series={names.flatMap((n) => [
            { key: n, label: `${n} — classified`, color: classColor(n), endLabel: n },
            { key: `${n} (Markov)`, label: `${n} — Markov`, color: classColor(n), dashed: true, endLabel: false },
          ])}
          initiallyHidden={hidden}
          height={360}
          zeroBased={view === "all"}
          yTitle="Area (km²)"
          yFormat={(x) => (view === "Glacial Lake" ? x.toFixed(2) : x.toFixed(1))}
          tooltipFormat={(x) => `${formatNum(x, 3)} km²`}
          endLabels
          ariaLabel="Classified and Markov hindcast class areas"
        />
        <div className="mt-6 grid max-w-4xl gap-4 text-[15px] leading-relaxed text-muted md:grid-cols-2">
          <p>
            Starting from {formatDate(series[0].date, { year: false })} alone, the model ends at{" "}
            <strong className="tabular text-ink">{formatNum(h.final_glacier_km2, 2)} km²</strong> of Glacier on{" "}
            {formatDate(v.predict_date, { year: false })}, against {formatNum(series[series.length - 1].Glacier, 2)} km² classified (total
            error {formatPct(h.final_error_pct, 2)} of the area).
          </p>
          <p>
            The largest Glacier miss is {formatSigned(h.largest_glacier_miss.km2, 2)} km² on{" "}
            {formatDate(h.largest_glacier_miss.date, { year: false })}, where the observed first-step loss ({formatNum(firstStepLoss, 2)} km²)
            was about twice the usual rate.
          </p>
        </div>
      </Section>

      <Note title="How the numbers were obtained">
        The validation table and its {formatPct(v.total_abs_error_pct, 2)} error are printed by the notebook. The baseline and
        hindcast are not printed (the hindcast is only plotted), so they are recomputed here from the printed class areas and
        matrix P with the notebook's own formulas.
      </Note>

      <div>
        <NotebookFigure figure={data.figures.hindcast_forecast} title="Original notebook figure — hindcast and forecast" />
        <WhyPerformed>
          A model is only worth running forward if it can reproduce dates it has not seen. Holding out the last interval tests
          one step; comparing against a no-change guess shows the model adds real information; the hindcast tests whether errors
          accumulate over many steps.
        </WhyPerformed>
      </div>
    </>
  );
}
