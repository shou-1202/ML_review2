import { useMemo, useState } from "react";
import useElementWidth from "./useElementWidth";

const C = {
  grid: "#E3EBF1",
  axis: "#8FA3B3",
  label: "#5E7486",
  ink: "#0C2235",
  surface: "#FFFFFF",
  accent: "#D4442B",
  shade: "#DCEFFA",
};

function niceTicks(min, max, count = 4) {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => raw <= s) || 10 * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toPrecision(12)));
  return ticks;
}

/**
 * Publication-style line chart over categorical x positions.
 *
 *  data      [{ [xKey]: "14 Nov", seriesKey: number|null, ... }]
 *  series    [{ key, label, color, dashed?, marker?, faded?, endLabel? }]
 *  highlightIndex / highlightLabel  - a marked x position (e.g. selected k)
 *  vlines    [{ index, label }]      - reference lines (e.g. forecast start)
 *  shadeFrom index                   - shaded region from index to the end
 *  onSelectIndex(i)                  - makes x positions clickable
 *  endLabels                         - label each visible line at its last point
 *
 * Hover shows a crosshair and a tooltip with every visible series' value.
 * With 2+ series a legend is shown; clicking an entry hides/shows that series
 * and the y-axis rescales to what is visible (colours never change).
 */
export default function LineChart({
  data,
  xKey = "label",
  series,
  height = 260,
  yFormat = (v) => v.toLocaleString("en-US"),
  tooltipFormat,
  yTitle,
  zeroBased = false,
  highlightIndex,
  highlightLabel,
  vlines = [],
  shadeFrom,
  shadeLabel,
  onSelectIndex,
  selectedIndex,
  initiallyHidden = [],
  endLabels = false,
  legend = true,
  ariaLabel,
}) {
  const [ref, width] = useElementWidth();
  const [hover, setHover] = useState(null);
  const [hidden, setHidden] = useState(() => new Set(initiallyHidden));
  const visible = series.filter((s) => !hidden.has(s.key));
  const fmtTip = tooltipFormat || yFormat;

  const w = Math.max(width, 120);
  const narrow = w < 360;
  const showEnd = endLabels && !narrow;
  const m = {
    top: 18,
    right: showEnd ? 116 : narrow ? 12 : 20,
    bottom: 34,
    left: narrow ? 42 : yTitle ? 62 : 54,
  };
  const pw = w - m.left - m.right;
  const ph = height - m.top - m.bottom;
  const n = data.length;

  const { ticks, yMin, yMax } = useMemo(() => {
    const vals = [];
    data.forEach((d) =>
      visible.forEach((s) => {
        const v = d[s.key];
        if (v !== null && v !== undefined && !Number.isNaN(v)) vals.push(v);
      })
    );
    if (vals.length === 0) return { ticks: [0, 1], yMin: 0, yMax: 1 };
    let lo = Math.min(...vals);
    const hi = Math.max(...vals);
    if (zeroBased) lo = Math.min(0, lo);
    const t = niceTicks(lo, hi, 4);
    return { ticks: t, yMin: t[0], yMax: t[t.length - 1] };
  }, [data, visible, zeroBased]);

  const x = (i) => m.left + (n === 1 ? pw / 2 : (i / (n - 1)) * pw);
  const y = (v) => m.top + ph - ((v - yMin) / (yMax - yMin || 1)) * ph;

  function pathFor(key) {
    let d = "";
    let pen = false;
    data.forEach((row, i) => {
      const v = row[key];
      if (v === null || v === undefined || Number.isNaN(v)) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  }

  function lastPoint(key) {
    for (let i = data.length - 1; i >= 0; i -= 1) {
      const v = data[i][key];
      if (v !== null && v !== undefined && !Number.isNaN(v)) return [i, v];
    }
    return null;
  }

  function indexFromEvent(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - (m.left - 10);
    const i = Math.round((px / pw) * (n - 1));
    return Math.max(0, Math.min(n - 1, i));
  }

  // end labels: spread vertically so they never overlap
  const ends = showEnd
    ? visible
        .filter((s) => s.endLabel !== false)
        .map((s) => {
          const lp = lastPoint(s.key);
          return lp ? { s, i: lp[0], v: lp[1], y: y(lp[1]) } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.y - b.y)
    : [];
  for (let k = 1; k < ends.length; k += 1) {
    if (ends[k].y - ends[k - 1].y < 15) ends[k].y = ends[k - 1].y + 15;
  }

  const maxLabel = Math.max(...data.map((d) => String(d[xKey] ?? "").length), 1);
  const labelEvery = Math.max(1, Math.ceil((n * (maxLabel * 6.6 + 14)) / pw));
  const tipLeft = hover !== null && x(hover) > w * 0.58;

  return (
    <div>
      {legend && series.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2" role="group" aria-label="Series">
          {series.map((s) => {
            const off = hidden.has(s.key);
            return (
              <button
                key={s.key}
                onClick={() =>
                  setHidden((prev) => {
                    const next = new Set(prev);
                    if (next.has(s.key)) next.delete(s.key);
                    else if (series.length - next.size > 1) next.add(s.key);
                    return next;
                  })
                }
                aria-pressed={!off}
                className={`flex items-center gap-2 text-[13px] transition-opacity ${
                  off ? "text-faint opacity-55" : "text-ink hover:text-navy"
                }`}
              >
                <svg width="22" height="10" aria-hidden="true">
                  <line
                    x1="1"
                    x2="21"
                    y1="5"
                    y2="5"
                    stroke={s.color}
                    strokeWidth="2.25"
                    strokeDasharray={s.dashed ? "4 3" : undefined}
                    strokeLinecap="round"
                  />
                </svg>
                <span className={off ? "line-through" : ""}>{s.label}</span>
              </button>
            );
          })}
        </div>
      )}

      <div ref={ref} className="relative w-full" style={{ height }}>
        <svg width={w} height={height} role="img" aria-label={ariaLabel} className="block select-none overflow-visible">
          {shadeFrom !== undefined && shadeFrom < n && (
            <>
              <rect x={x(shadeFrom)} y={m.top} width={x(n - 1) - x(shadeFrom)} height={ph} fill={C.shade} opacity="0.55" />
              {shadeLabel && (
                <text x={x(shadeFrom) + 8} y={m.top + 14} fill={C.label} fontSize="11" fontFamily="DM Mono, monospace">
                  {shadeLabel}
                </text>
              )}
            </>
          )}

          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={m.left}
                x2={m.left + pw}
                y1={y(t)}
                y2={y(t)}
                stroke={C.grid}
                strokeWidth="1"
                strokeDasharray={t === yMin ? undefined : "2 4"}
              />
              <line x1={m.left - 5} x2={m.left} y1={y(t)} y2={y(t)} stroke={C.axis} strokeWidth="1" />
              <text x={m.left - 9} y={y(t)} dy="0.32em" textAnchor="end" fill={C.label} fontSize="11" fontFamily="DM Mono, monospace">
                {yFormat(t)}
              </text>
            </g>
          ))}
          <line x1={m.left} x2={m.left} y1={m.top} y2={m.top + ph} stroke={C.axis} strokeWidth="1" />
          <line x1={m.left} x2={m.left + pw} y1={m.top + ph} y2={m.top + ph} stroke={C.axis} strokeWidth="1" />
          {yTitle && (
            <text
              transform={`translate(13 ${m.top + ph / 2}) rotate(-90)`}
              textAnchor="middle"
              fill={C.label}
              fontSize="11.5"
              fontFamily="Manrope Variable, Manrope, sans-serif"
            >
              {yTitle}
            </text>
          )}

          {data.map((d, i) => (
            <g key={i}>
              <line x1={x(i)} x2={x(i)} y1={m.top + ph} y2={m.top + ph + 4} stroke={C.axis} strokeWidth="1" />
              {(i % labelEvery === 0 || i === highlightIndex || i === selectedIndex) && (
                <text
                  x={x(i)}
                  y={height - 10}
                  textAnchor="middle"
                  fill={i === highlightIndex || i === selectedIndex ? C.accent : C.label}
                  fontWeight={i === highlightIndex || i === selectedIndex ? 600 : 400}
                  fontSize="11"
                  fontFamily="DM Mono, monospace"
                >
                  {d[xKey]}
                </text>
              )}
            </g>
          ))}

          {highlightIndex !== undefined && highlightIndex !== null && highlightIndex >= 0 && (
            <g>
              <line
                x1={x(highlightIndex)}
                x2={x(highlightIndex)}
                y1={m.top}
                y2={m.top + ph}
                stroke={C.accent}
                strokeWidth="1.25"
                strokeDasharray="4 3"
              />
              {highlightLabel && (
                <text
                  x={x(highlightIndex) + (x(highlightIndex) > w * 0.7 ? -6 : 6)}
                  y={m.top + 11}
                  textAnchor={x(highlightIndex) > w * 0.7 ? "end" : "start"}
                  fill={C.accent}
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="DM Mono, monospace"
                >
                  {highlightLabel}
                </text>
              )}
            </g>
          )}

          {vlines.map((v) => (
            <g key={`v${v.index}`}>
              <line x1={x(v.index)} x2={x(v.index)} y1={m.top} y2={m.top + ph} stroke={C.ink} strokeWidth="1" opacity="0.6" />
              {v.label && (
                <text x={x(v.index) - 6} y={m.top + 11} textAnchor="end" fill={C.label} fontSize="11" fontFamily="DM Mono, monospace">
                  {v.label}
                </text>
              )}
            </g>
          ))}

          {visible.map((s) => (
            <path
              key={s.key}
              d={pathFor(s.key)}
              fill="none"
              stroke={s.color}
              strokeWidth={s.faded ? 1.5 : 2.25}
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s.dashed ? "6 5" : undefined}
              opacity={s.faded ? 0.35 : 1}
            />
          ))}

          {visible.map((s) =>
            s.marker === false
              ? null
              : data.map((d, i) => {
                  const v = d[s.key];
                  if (v === null || v === undefined || Number.isNaN(v)) return null;
                  const active = i === hover || i === highlightIndex || i === selectedIndex;
                  return (
                    <circle
                      key={`${s.key}${i}`}
                      cx={x(i)}
                      cy={y(v)}
                      r={active ? 5.5 : 4}
                      fill={s.dashed ? C.surface : s.color}
                      stroke={s.dashed ? s.color : C.surface}
                      strokeWidth={s.dashed ? 1.75 : 2}
                      opacity={s.faded ? 0.4 : 1}
                    />
                  );
                })
          )}

          {ends.map((e) => (
            <g key={`end${e.s.key}`}>
              <line x1={x(e.i) + 8} x2={x(e.i) + 16} y1={y(e.v)} y2={e.y} stroke={e.s.color} strokeWidth="1" />
              <text x={x(e.i) + 20} y={e.y} dy="0.32em" fill={C.ink} fontSize="12" fontFamily="Manrope Variable, Manrope, sans-serif">
                {e.s.endLabel || e.s.label}
              </text>
            </g>
          ))}

          {hover !== null && (
            <line x1={x(hover)} x2={x(hover)} y1={m.top} y2={m.top + ph} stroke={C.ink} strokeWidth="1" opacity="0.35" />
          )}

          <rect
            x={m.left - 10}
            y={m.top}
            width={pw + 20}
            height={ph + m.bottom}
            fill="transparent"
            style={{ cursor: onSelectIndex ? "pointer" : "crosshair" }}
            onMouseMove={(e) => setHover(indexFromEvent(e))}
            onMouseLeave={() => setHover(null)}
            onClick={onSelectIndex ? (e) => onSelectIndex(indexFromEvent(e)) : undefined}
          />
        </svg>

        {hover !== null && (
          <div
            className="pointer-events-none absolute z-20 min-w-[170px] bg-midnight px-3.5 py-2.5 text-[12.5px] text-white shadow-lift"
            style={{
              top: m.top,
              left: tipLeft ? undefined : x(hover) + 14,
              right: tipLeft ? w - x(hover) + 14 : undefined,
            }}
          >
            <p className="mb-1.5 font-mono text-[12px] text-ice">{data[hover][xKey]}</p>
            {visible.map((s) => {
              const v = data[hover][s.key];
              if (v === null || v === undefined) return null;
              return (
                <div key={s.key} className="flex items-center justify-between gap-5 py-px text-white/75">
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-[3px] w-3.5" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </span>
                  <span className="tabular font-mono text-white">{fmtTip(v)}</span>
                </div>
              );
            })}
            {data[hover].note && (
              <p className={`mt-1.5 max-w-[240px] ${data[hover].noteTone === "warn" ? "text-coral" : "text-white/55"}`}>
                {data[hover].note}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
