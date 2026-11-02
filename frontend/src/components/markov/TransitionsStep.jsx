import LineChart from "../charts/LineChart";
import TransitionMatrix from "../TransitionMatrix";
import {
  ChoiceGroup,
  ClassName,
  Formula,
  Narrative,
  Note,
  NotebookFigure,
  Section,
  Split,
  WhatHappened,
  WhyPerformed,
} from "../StageDetails";
import { useMarkovSelection } from "./selection";
import { classColor } from "../../utils/classes";
import { formatInt, formatNum, formatPct } from "../../utils/format";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2025-11-29", "2025-12-04" -> "29 Nov–4 Dec"; same month -> "14–19 Nov" */
function shortInterval(from, to) {
  const [, m1, d1] = from.split("-").map(Number);
  const [, m2, d2] = to.split("-").map(Number);
  return m1 === m2 ? `${d1}–${d2} ${MON[m2 - 1]}` : `${d1} ${MON[m1 - 1]}–${d2} ${MON[m2 - 1]}`;
}

export default function TransitionsStep({ data }) {
  const t = data.transitions;
  const periods = t.periods;
  const names = data.classes.map((c) => c.name);
  const anomaly = data.forecast.anomaly;
  const sel = useMarkovSelection();
  const selected = Math.min(Math.max(0, sel.interval ?? 0), periods.length - 1);
  const p = periods[selected];
  const hasCounts = !!p.counts;

  const flows = [];
  names.forEach((from, i) =>
    names.forEach((to, j) => {
      if (i !== j) flows.push({ from, to, km2: p.area_moved_km2[i][j], px: p.counts?.[i][j] });
    })
  );
  flows.sort((a, b) => b.km2 - a.km2);
  const maxKm2 = Math.max(...flows.map((f) => f.km2), 1e-9);
  const pers = (cls) => periods.map((x) => x.persistence[cls]);

  return (
    <>
      <WhatHappened>
        <p>
          Each pair of consecutive maps was compared pixel by pixel. For every valid pixel the notebook recorded its class on
          the first date (row) and on the next date (column), giving a 3 × 3 table of counts n<sub>ij</sub> for each of the{" "}
          {periods.length} intervals. Dividing each row by its total turns the counts into probabilities.
        </p>
      </WhatHappened>

      <Formula caption="n_ij = pixels that were class i on one date and class j on the next — every row sums to 1">
        P<sub>ij</sub> = n<sub>ij</sub> / Σ<sub>k</sub> n<sub>ik</sub>
      </Formula>

      <Section title="Choose an interval" hint="Also selectable on the hero timeline">
        <ChoiceGroup
          label="Date interval"
          value={selected}
          onChange={sel.setInterval}
          options={periods.map((x) => ({
            value: x.index,
            label: x.label,
            flag: x.index === anomaly.period_index ? "!" : undefined,
          }))}
        />
      </Section>

      <Section title={`Transition probabilities, ${p.label}`} hint="Hover or click a cell">
        <TransitionMatrix
          key={selected}
          classes={names}
          P={p.P}
          digits={3}
          size="lg"
          stepDays={data.settings.step_days}
          ariaLabel={`Transition probabilities ${p.label}`}
          extra={(i, j) => (
            <p className="mt-2 border-t border-silver pt-2 text-[14px] leading-relaxed text-muted">
              {hasCounts ? (
                <>
                  <strong className="tabular">{formatInt(p.counts[i][j])}</strong> pixels made this transition.
                </>
              ) : (
                <>
                  ≈ <strong className="tabular text-ink">{formatNum(p.area_moved_km2[i][j], 3)} km²</strong> (
                  {formatNum(p.start_area_km2[names[i]], 3)} km² of {names[i]} on the start date × {formatNum(p.P[i][j], 3)}).
                </>
              )}
            </p>
          )}
        />
      </Section>

      {selected === anomaly.period_index && (
        <Note tone="warn" title="The 14 December lake anomaly">
          In this interval {formatPct(anomaly.lake_to_glacier * 100, 1)} of Glacial Lake pixels were labelled Glacier and only{" "}
          {formatPct(anomaly.lake_persistence * 100, 1)} stayed Lake; in every other interval Lake → Glacier is{" "}
          {formatNum(anomaly.lake_to_glacier_other_periods[0], 3)}–{formatNum(anomaly.lake_to_glacier_other_periods[1], 3)}. The
          lake area drops to {formatNum(anomaly.lake_area_km2, 2)} km² on 14 Dec and recovers on the next date — most likely
          ice or fresh snow on the lake surface, or a classification error, not a real loss of water. The forecast stage shows
          how this one interval affects the model.
        </Note>
      )}

      <Split
        narrative={
          <Narrative title="How pixels moved">
            <p>
              The largest changes between classes in {p.label}
              {hasCounts ? "." : ", as area: the start-date area of a class × its transition probability."}
            </p>
          </Narrative>
        }
      >
        <div className="grid gap-12 lg:grid-cols-2">
          <ul className="space-y-5">
            {flows.slice(0, 4).map((f) => (
              <li key={`${f.from}${f.to}`}>
                <div className="flex items-center justify-between gap-3 text-[14px]">
                  <span className="flex min-w-0 flex-wrap items-center gap-1.5 font-semibold text-ink">
                    <ClassName name={f.from} /> <span className="font-normal text-faint">→</span> <ClassName name={f.to} />
                  </span>
                  <span className="tabular shrink-0 whitespace-nowrap font-mono text-[15px] text-navy">
                    {hasCounts ? `${formatInt(f.px)} px` : `≈ ${formatNum(f.km2, 3)} km²`}
                  </span>
                </div>
                <div className="mt-2 h-2.5 bg-raised">
                  <div className="h-full" style={{ width: `${(f.km2 / maxKm2) * 100}%`, backgroundColor: classColor(f.to) }} />
                </div>
              </li>
            ))}
          </ul>
          <table className="w-full self-start border-t-2 border-navy text-[14.5px]">
            <caption className="pb-3 text-left font-mono text-[12px] text-faint">Classified area, km²</caption>
            <tbody>
              {names.map((n) => {
                const a = p.start_area_km2[n];
                const b = p.end_area_km2[n];
                return (
                  <tr key={n} className="border-b border-silver/70">
                    <td className="py-3 font-semibold text-ink">
                      <ClassName name={n} />
                    </td>
                    <td className="tabular py-3 pl-2 text-right font-mono text-muted">{formatNum(a, 3)}</td>
                    <td className="px-2 text-center text-faint">→</td>
                    <td className="tabular py-3 text-right font-mono text-ink">{formatNum(b, 3)}</td>
                    <td className={`tabular py-3 pl-3 text-right font-mono text-[12.5px] ${Math.abs(b - a) > 0.2 ? "text-coral-ink" : "text-faint"}`}>
                      {b - a >= 0 ? "+" : "−"}
                      {Math.abs(b - a).toFixed(3)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Split>

      <Section title="Persistence in each interval" hint="Diagonal of each matrix · click an interval">
        <LineChart
          data={periods.map((x) => ({
            label: shortInterval(x.from, x.to),
            ...x.persistence,
            note: x.index === anomaly.period_index ? "Lake anomaly interval" : undefined,
            noteTone: "warn",
          }))}
          series={names.map((n) => ({ key: n, label: n, color: classColor(n) }))}
          height={320}
          yTitle="P(class stays the same)"
          yFormat={(v) => v.toFixed(2)}
          tooltipFormat={(v) => formatNum(v, 3)}
          selectedIndex={selected}
          onSelectIndex={sel.setInterval}
          endLabels
          ariaLabel="Persistence probability per interval"
        />
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-muted">
          Glacier stays between {formatNum(Math.min(...pers("Glacier")), 3)} and {formatNum(Math.max(...pers("Glacier")), 3)},
          Non-Glacier Land between {formatNum(Math.min(...pers("Non-Glacier Land")), 3)} and{" "}
          {formatNum(Math.max(...pers("Non-Glacier Land")), 3)} — steady rates, which supports a single Markov matrix. The lake's
          one break is {anomaly.period_label}.
        </p>
      </Section>

      {t.source === "figure_transcription" && t.check && (
        <Note title="Where these values come from">
          The notebook computes these per-interval matrices but only draws them as a figure; it never prints them. The values
          shown are that figure's 3-decimal annotations. They are checked on every load: rows sum to 1 within{" "}
          {formatNum(t.check.max_row_sum_deviation, 3)}, and weighting them by each date's class area reproduces the notebook's
          printed pooled matrix within {formatNum(t.check.max_abs_difference_vs_printed_P, 4)} (
          {t.check.passed ? "check passed" : "check failed"}). Pixel counts per interval were not saved and need the GeoTIFFs;
          areas moved are therefore approximate.
        </Note>
      )}

      <div>
        <NotebookFigure figure={data.figures.period_matrices} title="Original notebook figure — all eight matrices" />
        <NotebookFigure figure={data.figures.persistence} title="Original notebook figure — persistence per period" />
        <WhyPerformed>
          Counting transitions interval by interval shows not only how much each class changed, but where its pixels went.
          Looking at each interval separately also tests the key Markov assumption — that the transition rates stay roughly
          constant — before the intervals are pooled into one model.
        </WhyPerformed>
      </div>
    </>
  );
}
