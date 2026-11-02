import { useState } from "react";
import MatrixHeatmap from "./MatrixHeatmap";
import { ClassName, Readout } from "./StageDetails";
import { formatNum } from "../utils/format";

/**
 * Interactive 3 × 3 transition probability matrix. Hover (or focus) a cell to
 * read what its probability means; click to pin it. `extra(i, j)` adds context
 * lines for a cell (e.g. the area that moved, or an anomaly note).
 */
export default function TransitionMatrix({
  classes,
  P,
  stepDays = 5,
  digits = 4,
  extra,
  defaultCell = { i: 0, j: 2 },
  ariaLabel = "Transition probability matrix",
  size = "md",
}) {
  const [active, setActive] = useState(null);
  const [selected, setSelected] = useState(defaultCell);
  const cell = active || selected;

  const i = cell?.i;
  const j = cell?.j;
  const p = cell ? P[i][j] : null;
  const rowSum = cell ? P[i].reduce((a, b) => a + b, 0) : null;

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] xl:items-start">
      <MatrixHeatmap
        rowLabels={classes}
        colLabels={classes}
        values={P}
        format={(v) => formatNum(v, digits)}
        intensity={(a, b) => Math.sqrt(P[a][b])}
        active={active}
        selected={selected}
        onActive={setActive}
        onSelect={setSelected}
        ariaLabel={ariaLabel}
        size={size}
      />

      {cell && (
        <Readout>
          <p className="font-mono text-[12px] text-faint">{active ? "Hovered cell" : "Selected cell"}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] font-semibold text-ink">
            <ClassName name={classes[i]} />
            <span className="text-faint">→</span>
            <ClassName name={classes[j]} />
          </p>
          <p className="tabular mt-3 font-mono text-[38px] leading-none text-navy">{formatNum(p, digits)}</p>
          <p className="mt-3 leading-relaxed text-muted">
            {i === j ? (
              <>
                <span className="font-semibold text-ink">Persistence.</span> A pixel classified as {classes[i]} has a{" "}
                <span className="tabular font-semibold text-ink">{formatNum(p * 100, 1)}%</span> probability of still being{" "}
                {classes[i]} one step ({stepDays} days) later.
              </>
            ) : (
              <>
                A pixel classified as {classes[i]} has a{" "}
                <span className="tabular font-semibold text-ink">{formatNum(p * 100, 2)}%</span> probability of being classified
                as {classes[j]} one step ({stepDays} days) later
                {p > 0 ? <> — about 1 in {Math.max(1, Math.round(1 / p)).toLocaleString("en-US")} pixels.</> : "."}
              </>
            )}
          </p>
          <p className="mt-2 font-mono text-[12px] text-faint">
            Row “from {classes[i]}” sums to {formatNum(rowSum, digits)}
          </p>
          {extra && extra(i, j)}
        </Readout>
      )}
    </div>
  );
}
