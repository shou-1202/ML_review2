import { ClassSwatch } from "./StageDetails";
import { classShort } from "../utils/classes";

// Sequential scales: one hue family, light -> dark.
const SCALES = {
  ice: ["#F2F8FC", "#CFE8F7", "#8FCBEE", "#3E95C9", "#1B5583", "#102B45"],
  coral: ["#FBF4F2", "#FBD9D0", "#F7AE9C", "#EE7A5F", "#C9482F", "#7E2414"],
};

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function scaleColor(t, scale = "ice") {
  const stops = SCALES[scale] || SCALES.ice;
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(x));
  const f = x - i;
  const a = hexToRgb(stops[i]);
  const b = hexToRgb(stops[i + 1]);
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/**
 * Class × class heatmap (transition, confusion and change matrices). Each
 * cell is a button: hover or focus reports it through `onActive`, click pins
 * it through `onSelect`.
 *
 *  values[i][j]       raw numbers
 *  format(v, i, j)    main text in the cell
 *  sub(v, i, j)       optional second line (e.g. row share)
 *  intensity(i, j)    0..1 colour strength (defaults to v / max)
 */
export default function MatrixHeatmap({
  rowLabels,
  colLabels,
  values,
  format = (v) => String(v),
  sub,
  intensity,
  accent = "teal",
  rowTitle = "From",
  colTitle = "To",
  active,
  selected,
  onActive,
  onSelect,
  ariaLabel,
  size = "md",
}) {
  const max = Math.max(...values.flat().map((v) => Math.abs(v)), 1e-9);
  const scale = accent === "amber" ? "coral" : "ice";
  const isAt = (cell, i, j) => cell && cell.i === i && cell.j === j;
  const cellH = size === "lg" ? "h-[96px] sm:h-[112px]" : "h-[78px] sm:h-[88px]";

  return (
    <div className="overflow-x-auto pb-1">
      <div className="min-w-[330px]">
        <div
          role="grid"
          aria-label={ariaLabel}
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: `minmax(84px, 150px) repeat(${colLabels.length}, minmax(64px, 1fr))` }}
        >
          <div className="flex flex-col justify-end pb-2 font-mono text-[11.5px] leading-tight text-faint">
            <span>{colTitle} →</span>
            <span>{rowTitle} ↓</span>
          </div>
          {colLabels.map((c) => (
            <div key={c} className="flex items-end justify-center gap-1.5 pb-2 text-[12px] font-semibold text-ink sm:text-[13px]" role="columnheader">
              <ClassSwatch name={c} />
              <span className="truncate">{classShort(c)}</span>
            </div>
          ))}

          {rowLabels.map((r, i) => (
            <div key={r} className="contents" role="row">
              <div className="flex items-center gap-2 pr-2 text-[12px] font-semibold text-ink sm:pr-3 sm:text-[13px]" role="rowheader">
                <ClassSwatch name={r} />
                <span className="leading-tight">{r}</span>
              </div>
              {colLabels.map((c, j) => {
                const v = values[i][j];
                const t = intensity ? intensity(i, j) : Math.abs(v) / max;
                const dark = t > 0.55;
                const isActive = isAt(active, i, j);
                const isSel = isAt(selected, i, j);
                return (
                  <button
                    key={c}
                    role="gridcell"
                    aria-selected={isSel}
                    onMouseEnter={() => onActive?.({ i, j })}
                    onMouseLeave={() => onActive?.(null)}
                    onFocus={() => onActive?.({ i, j })}
                    onBlur={() => onActive?.(null)}
                    onClick={() => onSelect?.({ i, j })}
                    className={`relative flex ${cellH} flex-col items-center justify-center transition-[box-shadow,transform] duration-150 ${
                      isSel
                        ? "z-10 shadow-[inset_0_0_0_3px_#FF694F]"
                        : isActive
                        ? "z-10 shadow-[inset_0_0_0_2px_rgba(12,34,53,0.55)]"
                        : ""
                    }`}
                    style={{ backgroundColor: scaleColor(t, scale) }}
                  >
                    <span className={`tabular font-mono text-[13.5px] ${size === "lg" ? "sm:text-[17px]" : "sm:text-[15px]"} ${dark ? "text-white" : "text-ink"}`}>
                      {format(v, i, j)}
                    </span>
                    {sub && (
                      <span className={`tabular font-mono text-[11px] ${dark ? "text-white/75" : "text-muted"}`}>{sub(v, i, j)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3 pl-[88px] font-mono text-[11px] text-faint sm:pl-[150px]" aria-hidden="true">
          <span>0</span>
          <span className="h-1.5 w-40" style={{ background: `linear-gradient(90deg, ${SCALES[scale].join(",")})` }} />
          <span>high</span>
        </div>
      </div>
    </div>
  );
}
