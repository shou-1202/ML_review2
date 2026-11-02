import { useState } from "react";
import DataTable from "../DataTable";
import MatrixHeatmap from "../MatrixHeatmap";
import MetricCard from "../MetricCard";
import { ClassName, Narrative, Note, NotebookFigure, Readout, Section, Split, WhatHappened, WhyPerformed } from "../StageDetails";
import { formatInt, formatNum, formatPct } from "../../utils/format";

export default function EvaluationStep({ data }) {
  const ev = data.evaluation;
  const o = ev.overall;
  const cm = ev.confusion_matrix;
  const labels = cm.labels;
  const rowTotals = cm.values.map((r) => r.reduce((a, b) => a + b, 0));
  const colTotals = labels.map((_, j) => cm.values.reduce((a, r) => a + r[j], 0));
  const [active, setActive] = useState(null);
  const [selected, setSelected] = useState({ i: 0, j: 1 });
  const cell = active || selected;

  const report = Object.fromEntries(ev.class_report.map((r) => [r.class, r]));
  const lake = report["Glacial Lake"];
  const glacier = report["Glacier"];
  const land = report["Non-Glacier Land"];
  const mixed = data.clusters.find((c) => c.interpretation.startsWith("Intermediate"));
  const dates = ev.by_date;
  const oaRange = [Math.min(...dates.map((d) => d.oa)), Math.max(...dates.map((d) => d.oa))];
  const v = cell ? cm.values[cell.i][cell.j] : 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 xl:grid-cols-5">
        <MetricCard label="Overall agreement" value={formatPct(o.oa, 2)} hint="Same class as the threshold labels" />
        <MetricCard label="Cohen's kappa" value={formatNum(o.kappa, 3)} hint="Moderate, after chance" accent="ink" />
        <MetricCard label="Macro F1" value={formatNum(o.macro_f1, 3)} hint="Lake counts as much as land" accent="ink" />
        <MetricCard label="ARI" value={formatNum(o.ari, 3)} hint="Naming-free" accent="teal" />
        <MetricCard label="NMI" value={formatNum(o.nmi, 3)} hint="Naming-free" accent="teal" />
      </div>

      <WhatHappened>
        <p>
          The named clusters were compared with the threshold reference labels over all {formatInt(o.points)} points. Overall
          agreement and kappa use the cluster names from the interpretation stage; ARI and NMI compare the raw cluster
          numbers directly, so they do not depend on the naming at all.
        </p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5">
          <li>
            <strong>About three in four points</strong> get the same class as the threshold labels ({formatPct(o.oa, 2)}).
          </li>
          <li>
            Kappa {formatNum(o.kappa, 3)} is <strong>moderate</strong> agreement once chance agreement is removed.
          </li>
          <li>
            ARI {formatNum(o.ari, 3)} and NMI {formatNum(o.nmi, 3)} are of the same order, so the agreement comes from the
            cluster structure itself, not from the naming step.
          </li>
          <li>Macro F1 {formatNum(o.macro_f1, 3)} is pulled down by the very weak Glacial Lake class.</li>
        </ul>
      </WhatHappened>

      <Section title="Confusion matrix, all dates" hint="Hover or click a cell — colour = share of the reference row">
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start">
          <MatrixHeatmap
            rowLabels={labels}
            colLabels={labels}
            values={cm.values}
            format={(x) => formatInt(x)}
            sub={(x, i) => formatPct((100 * x) / rowTotals[i], 1)}
            intensity={(i, j) => cm.values[i][j] / rowTotals[i]}
            rowTitle="Reference"
            colTitle="K-Means class"
            active={active}
            selected={selected}
            onActive={setActive}
            onSelect={setSelected}
            size="lg"
            ariaLabel="Confusion matrix of reference classes against K-Means classes"
          />
          {cell && (
            <Readout>
              <p className="font-mono text-[12px] text-faint">{active ? "Hovered cell" : "Selected cell"}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold text-ink">
                Reference <ClassName name={labels[cell.i]} /> → K-Means <ClassName name={labels[cell.j]} />
              </p>
              <p className="tabular mt-3 font-mono text-[38px] leading-none text-navy">{formatInt(v)}</p>
              <p className="mt-3 leading-relaxed text-muted">
                {formatPct((100 * v) / rowTotals[cell.i], 1)} of the {formatInt(rowTotals[cell.i])} reference {labels[cell.i]}{" "}
                points were put in the K-Means “{labels[cell.j]}” class
                {colTotals[cell.j] ? (
                  <>
                    , which makes up {formatPct((100 * v) / colTotals[cell.j], 1)} of everything K-Means called “{labels[cell.j]}”
                  </>
                ) : null}
                .{" "}
                {cell.i === cell.j
                  ? "This diagonal cell counts agreement."
                  : mixed && labels[cell.j] === mixed.assigned_class
                  ? `These points sit in cluster ${mixed.id}, the mixed cluster.`
                  : "This is disagreement between the two clean clusters."}
              </p>
            </Readout>
          )}
        </div>
      </Section>

      <Split
        narrative={
          <Narrative title="Class by class">
            <p>
              <strong>Non-Glacier Land</strong> — precision {formatNum(land.precision, 3)}: whatever K-Means calls land really
              is land. Recall {formatNum(land.recall, 3)}: some sunlit rock and light moraine is bright enough to fall into the
              mixed cluster.
            </p>
            <p>
              <strong>Glacier</strong> — precision {formatNum(glacier.precision, 3)} but recall only {formatNum(glacier.recall, 3)}:
              bright snow is separated very cleanly, but darker (shadowed, dirty) glacier points went to the mixed cluster.
            </p>
            <p>
              <strong>Glacial Lake</strong> — recall {formatNum(lake.recall, 3)} (every lake point is in the mixed cluster) but
              precision {formatNum(lake.precision, 3)}, because that cluster also holds {formatInt(ev.disagreeing_in_mixed_cluster)}{" "}
              non-lake points. F1 {formatNum(lake.f1, 3)}: the lake was not found as a separate group.
            </p>
          </Narrative>
        }
      >
        <DataTable
          rows={[...ev.class_report, { ...ev.macro_avg, class: "Macro average" }, { ...ev.weighted_avg, class: "Weighted average" }]}
          pageSize={10}
          columns={[
            {
              key: "class",
              label: "Class",
              sortable: false,
              format: (c) => (c.endsWith("average") ? <span className="text-muted">{c}</span> : <span className="font-semibold"><ClassName name={c} /></span>),
            },
            { key: "precision", label: "Precision", align: "right", format: (x) => formatNum(x, 3) },
            { key: "recall", label: "Recall", align: "right", format: (x) => formatNum(x, 3) },
            { key: "f1", label: "F1", align: "right", format: (x) => formatNum(x, 3) },
            { key: "support", label: "Reference points", align: "right", format: (x) => formatInt(x) },
          ]}
        />
        <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-muted">
          Of the {formatInt(ev.disagreeing_points)} points that disagree,{" "}
          <strong className="tabular text-ink">{formatInt(ev.disagreeing_in_mixed_cluster)}</strong> (
          {formatPct((100 * ev.disagreeing_in_mixed_cluster) / ev.disagreeing_points, 2)}) are in the mixed cluster — the
          land-versus-bright-snow boundary is almost perfect.
        </p>
      </Split>

      <Note title="Agreement, not accuracy">
        The reference is a rule-based threshold product, not field-checked truth, so these numbers measure agreement between
        methods. Agreement was stable across dates ({formatPct(oaRange[0], 2)}–{formatPct(oaRange[1], 2)}, see the maps
        stage)
        {ev.decision_tree && (
          <>
            {" "}
            and almost identical against the {ev.decision_tree.model} maps over all pixels ({formatPct(ev.decision_tree.oa, 2)},
            kappa {formatNum(ev.decision_tree.kappa, 3)})
          </>
        )}
        .
      </Note>

      <div>
        <NotebookFigure figure={data.figures.confusion} />
        <WhyPerformed>
          Overall agreement is easy to read but dominated by the large classes. Kappa corrects for chance; macro F1 gives
          the small lake class the same weight as land; ARI and NMI check that the result does not depend on how clusters
          were named. Together they show both how much K-Means agrees with the reference and where it does not.
        </WhyPerformed>
      </div>
    </>
  );
}
