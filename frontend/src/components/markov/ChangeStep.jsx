import { useState } from "react";
import { assetUrl } from "../../services/api";
import DataTable from "../DataTable";
import MatrixHeatmap from "../MatrixHeatmap";
import { ClassName, Narrative, NotebookFigure, Readout, Section, Split, StatGrid, WhatHappened, WhyPerformed } from "../StageDetails";
import { formatDate, formatNum, formatPct, formatSigned } from "../../utils/format";

function ChangeMap({ ch, model }) {
  const legend = ch.map.legend;
  const changed = legend.filter((l) => l.changed).sort((a, b) => b.km2 - a.km2);
  const kept = legend.filter((l) => !l.changed);
  return (
    <div className="-mx-5 bg-midnight text-white shadow-lift sm:mx-0">
      <div className="grid gap-10 p-5 sm:p-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <figure>
          <img
            src={assetUrl(ch.map.image_url)}
            alt={`Change map, ${formatDate(ch.first_date)} to ${formatDate(ch.last_date)}`}
            className="mx-auto block h-auto w-full max-w-[660px]"
          />
          <figcaption className="mx-auto mt-4 max-w-[660px] font-mono text-[11.5px] text-white/45">
            Change map, {formatDate(ch.first_date)} → {formatDate(ch.last_date)} · {model} maps · map area cropped from
            the notebook figure (Cell 3)
          </figcaption>
        </figure>
        <div className="lg:border-l lg:border-white/10 lg:pl-8">
          <p className="font-serif text-[28px] font-medium leading-tight">What changed, and where</p>
          <p className="mt-2 text-[13.5px] text-white/55">Colours exactly as in the notebook figure; area from the change matrix.</p>
          <ul className="mt-6 space-y-3">
            {changed.map((l) => (
              <li key={l.code} className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                <span className="flex items-start gap-2.5 text-[13.5px] leading-snug text-white/85">
                  <span className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ backgroundColor: l.color }} />
                  {l.label}
                </span>
                <span className="tabular shrink-0 font-mono text-[14px] text-white">{formatNum(l.km2, 3)} km²</span>
              </li>
            ))}
          </ul>
          <ul className="mt-5 space-y-1.5">
            {kept.map((l) => (
              <li key={l.code} className="flex items-center gap-2.5 text-[12.5px] text-white/55">
                <span className="h-3 w-3 shrink-0" style={{ backgroundColor: l.color }} />
                {l.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function ChangeStep({ data }) {
  const ch = data.change;
  const names = data.classes.map((c) => c.name);
  const M = ch.matrix_km2;
  const rowTotals = M.map((r) => r.reduce((a, b) => a + b, 0));
  const [active, setActive] = useState(null);
  const [selected, setSelected] = useState({ i: 0, j: 2 });
  const cell = active || selected;
  const v = cell ? M[cell.i][cell.j] : 0;
  const first = formatDate(ch.first_date, { year: false });
  const last = formatDate(ch.last_date, { year: false });

  return (
    <>
      <StatGrid
        columns={4}
        items={[
          ["Changed area", `${formatNum(ch.changed_km2, 2)} km²`, "amber"],
          ["Share of study area", formatPct(ch.changed_pct, 1), "amber"],
          ["Glacier → Land", `${formatNum(ch.glacier_to_land_km2, 2)} km²`],
          ["Lake pixels retained", formatPct(ch.lake_retained_pct, 0)],
        ]}
      />

      <WhatHappened>
        <p>
          Skipping the intermediate dates, the notebook compared the first map ({formatDate(ch.first_date)}) directly with the last
          ({formatDate(ch.last_date)}) and summed the area of every from → to combination. Diagonal cells are area that kept its
          class; everything off the diagonal changed. In total <strong className="tabular">{formatNum(ch.changed_km2, 3)} km²</strong>{" "}
          ({formatPct(ch.changed_pct, 2)}) changed class, and Glacier → Non-Glacier Land alone was{" "}
          {formatNum(ch.glacier_to_land_km2, 3)} km² — {formatPct(ch.glacier_to_land_pct_of_glacier, 0)} of the {first} glacier area.
        </p>
      </WhatHappened>

      <Section title="Spatial change map">
        {ch.map.image_url ? (
          <ChangeMap ch={ch} model={data.settings.model_title} />
        ) : (
          <NotebookFigure figure={data.figures.change_map} title="Notebook change map" open />
        )}
        <p className="mt-6 max-w-3xl text-[15px] leading-relaxed text-muted">
          Orange is Glacier → Non-Glacier Land, spread over the lower slopes and the edges of the remaining snow patches. The
          upper, northern and eastern areas kept their snow. The few green patches (Non-Glacier Land → Glacier) are small and
          scattered, which fits new snow or classification noise. The lake's changes form a thin ring along the shore, from mixed
          water–land pixels at the edge.
        </p>
      </Section>

      <Section title={`Change matrix, ${first} → ${last}`} hint="km² · colour = share of the starting class">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start">
          <MatrixHeatmap
            rowLabels={names}
            colLabels={names}
            values={M}
            format={(x) => formatNum(x, 3)}
            sub={(x, i) => formatPct((100 * x) / rowTotals[i], 1)}
            intensity={(i, j) => M[i][j] / rowTotals[i]}
            accent="amber"
            rowTitle={first}
            colTitle={last}
            active={active}
            selected={selected}
            onActive={setActive}
            onSelect={setSelected}
            size="lg"
            ariaLabel="Area changing between classes from the first to the last date"
          />
          {cell && (
            <Readout>
              <p className="font-mono text-[12px] text-faint">{active ? "Hovered cell" : "Selected cell"}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold text-ink">
                <ClassName name={names[cell.i]} /> on {first} → <ClassName name={names[cell.j]} /> on {last}
              </p>
              <p className="tabular mt-3 font-mono text-[38px] leading-none text-navy">
                {formatNum(v, 3)}
                <span className="ml-1 text-[16px] text-muted">km²</span>
              </p>
              <p className="mt-3 leading-relaxed text-muted">
                {formatPct((100 * v) / rowTotals[cell.i], 1)} of the {formatNum(rowTotals[cell.i], 3)} km² that was {names[cell.i]}{" "}
                on {first}. {cell.i === cell.j ? "This area kept its class." : "This area changed class."}
              </p>
            </Readout>
          )}
        </div>
      </Section>

      <Split
        narrative={
          <Narrative title="Gains, losses and net change">
            <p>Gain is the area a class received from the others; loss is the area it gave away.</p>
            <p>
              The lake kept <strong>{formatPct(ch.lake_retained_pct, 0)}</strong> of its pixels.
            </p>
          </Narrative>
        }
      >
        <DataTable
          rows={ch.rows}
          pageSize={5}
          columns={[
            { key: "class", label: "Class", sortable: false, format: (c) => <span className="font-semibold"><ClassName name={c} /></span> },
            { key: "gain_km2", label: "Gain km²", align: "right", format: (x) => formatNum(x, 3) },
            { key: "loss_km2", label: "Loss km²", align: "right", format: (x) => formatNum(x, 3) },
            {
              key: "net_km2",
              label: "Net km²",
              align: "right",
              format: (x) => <span className={x < 0 ? "text-coral-ink" : "text-cyan-ink"}>{formatSigned(x, 3)}</span>,
            },
            { key: "retained_pct", label: "Retained", align: "right", format: (x) => formatPct(x, 1) },
          ]}
        />
      </Split>

      <div>
        <NotebookFigure figure={data.figures.change_map} title="Original notebook figure — change map with legend" />
        <NotebookFigure figure={data.figures.change_gain_loss} title="Original notebook figure — change matrix and gain/loss" />
        <WhyPerformed>
          The Markov matrix describes average 5-day behaviour; the first-to-last comparison shows the net result on the ground
          after 40 days and, through the change map, where it happened.
        </WhyPerformed>
      </div>
    </>
  );
}
