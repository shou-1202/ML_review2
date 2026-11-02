import TransitionMatrix from "../TransitionMatrix";
import { ClassName, Formula, Narrative, NotebookFigure, Split, WhatHappened, WhyPerformed } from "../StageDetails";
import { formatDate, formatNum } from "../../utils/format";

export default function MatrixStep({ data }) {
  const mk = data.markov;
  const P = mk.P;
  const names = data.classes.map((c) => c.name);
  const periods = data.transitions.periods;
  const anomaly = data.forecast.anomaly;
  const ex = mk.worked_example;
  const lakeI = names.indexOf("Glacial Lake");
  const glacierI = names.indexOf("Glacier");

  return (
    <>
      <WhatHappened>
        <p>
          The transition counts of all {periods.length} intervals were added together and converted to row probabilities once
          more. The result is one matrix P for an average {mk.step_days}-day step — the Markov model itself. Row <em>i</em> holds
          the probabilities that a pixel starting in class <em>i</em> moves to each class one step later, so every row sums to 1;
          the diagonal is the persistence.
        </p>
      </WhatHappened>

      {/* centrepiece */}
      <section className="-mx-5 bg-surface px-5 py-12 shadow-panel sm:mx-0 sm:px-10 sm:py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[12.5px] text-coral-ink">The Markov model</p>
            <h3 className="mt-2 font-serif text-[clamp(2rem,3.4vw,3rem)] font-medium leading-none text-navy">
              Pooled transition matrix P
            </h3>
          </div>
          <p className="font-mono text-[12.5px] text-muted">One step = {mk.step_days} days · hover or click any cell</p>
        </div>
        <TransitionMatrix
          classes={names}
          P={P}
          digits={4}
          size="lg"
          stepDays={mk.step_days}
          defaultCell={{ i: glacierI, j: names.indexOf("Non-Glacier Land") }}
          extra={(i, j) => {
            const vals = periods.map((p) => p.P[i][j]);
            return (
              <p className="mt-2 border-t border-silver pt-2 text-[14px] leading-relaxed text-muted">
                Across the {periods.length} intervals this probability ranged{" "}
                <strong className="tabular text-ink">
                  {formatNum(Math.min(...vals), 3)}–{formatNum(Math.max(...vals), 3)}
                </strong>
                .
                {i === lakeI && (j === glacierI || j === lakeI) && (
                  <span className="text-coral-ink">
                    {" "}
                    The extreme value comes from the {anomaly.period_label} interval (the 14 Dec lake anomaly).
                  </span>
                )}
              </p>
            );
          }}
        />
      </section>

      <div className="grid gap-px bg-silver md:grid-cols-2">
        <div className="bg-snow md:pr-8">
          <Formula caption="A(t) = row vector of class areas (or shares) at step t">A(t+1) = A(t) × P</Formula>
        </div>
        <div className="bg-snow md:pl-8">
          <Formula caption="Each class's next area mixes every starting class">
            A<sub>j</sub>(t+1) = Σ<sub>i</sub> A<sub>i</sub>(t) · P<sub>ij</sub>
          </Formula>
        </div>
      </div>

      <Split
        narrative={
          <Narrative title={`One step from ${formatDate(ex.start_date, { year: false })}`}>
            <p>
              Multiplying the classified areas of {formatDate(ex.start_date)} by P gives the next {mk.step_days}-day state,{" "}
              {formatDate(ex.next_date)} — exactly the first step of the notebook's forecast.
            </p>
            <p className="text-[13.5px] text-faint">Any difference from the notebook comes only from P being printed to 4 decimals.</p>
          </Narrative>
        }
      >
        <table className="w-full border-t-2 border-navy text-[15px]">
          <thead>
            <tr className="border-b border-silver text-left font-mono text-[12px] text-faint">
              <th className="py-3 font-normal">Class</th>
              <th className="py-3 text-right font-normal">A({formatDate(ex.start_date, { year: false })}) km²</th>
              <th className="py-3 text-right font-normal">A × P km²</th>
              <th className="py-3 text-right font-normal">Notebook forecast</th>
            </tr>
          </thead>
          <tbody>
            {names.map((n, j) => (
              <tr key={n} className="border-b border-silver/70">
                <td className="py-3.5 font-semibold text-ink">
                  <ClassName name={n} />
                </td>
                <td className="tabular py-3.5 text-right font-mono text-muted">{formatNum(ex.start_km2[j], 3)}</td>
                <td className="tabular py-3.5 text-right font-mono text-[17px] text-navy">{formatNum(ex.result_km2[j], 3)}</td>
                <td className="tabular py-3.5 text-right font-mono text-muted">
                  {ex.notebook_forecast_km2 ? formatNum(ex.notebook_forecast_km2[j], 3) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-5 overflow-x-auto whitespace-nowrap bg-frost/60 px-4 py-3 font-mono text-[13px] text-muted">
          Glacier: {names.map((n, i) => `${formatNum(ex.start_km2[i], 3)} × ${formatNum(P[i][glacierI], 4)}`).join(" + ")} ={" "}
          <span className="text-navy">{formatNum(ex.result_km2[glacierI], 3)} km²</span>
        </p>
      </Split>

      <div>
        <NotebookFigure figure={data.figures.validation} title="Original notebook figure — matrix and validation" />
        <WhyPerformed>
          A first-order Markov chain assumes the next state depends only on the current one, and that the transition rates
          stay the same every step. Pooling the eight intervals gives the best single estimate of those rates; the transitions
          stage showed they were steady for Glacier and Non-Glacier Land, which is what makes one matrix a reasonable model of
          the whole period — and what lets it be run forward for validation and forecasting.
        </WhyPerformed>
      </div>
    </>
  );
}
