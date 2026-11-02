import { useState } from "react";
import useElementWidth from "./useElementWidth";
import { classColor } from "../../utils/classes";
import { formatPct } from "../../utils/format";

/**
 * 100% stacked area of the three classes' share of the study area on each
 * observation date. Bands are drawn bottom → top in `order`; each band is
 * labelled directly at both ends, and hovering a date shows every share.
 *
 *  points  [{ label, shares: { [className]: pct } , flag? }]
 */
export default function ShareRibbon({ points, order = ["Non-Glacier Land", "Glacial Lake", "Glacier"], height = 300, tone = "light" }) {
  const [ref, width] = useElementWidth();
  const [hover, setHover] = useState(null);
  const dark = tone === "dark";
  const w = Math.max(width, 200);
  const narrow = w < 520;
  const m = { top: 10, right: narrow ? 8 : 92, bottom: 30, left: narrow ? 8 : 92 };
  const pw = w - m.left - m.right;
  const ph = height - m.top - m.bottom;
  const n = points.length;
  const x = (i) => m.left + (i / (n - 1)) * pw;
  const y = (pct) => m.top + ph - (pct / 100) * ph;

  // cumulative boundaries per date
  const cum = points.map((p) => {
    let acc = 0;
    return order.map((c) => {
      const lo = acc;
      acc += p.shares[c] ?? 0;
      return [lo, acc];
    });
  });

  function smooth(pts) {
    // Catmull-Rom → cubic Bézier for an even, elegant ribbon
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i += 1) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
    }
    return d;
  }

  const bands = order.map((c, k) => {
    const top = points.map((_, i) => [x(i), y(cum[i][k][1])]);
    const bot = points.map((_, i) => [x(i), y(cum[i][k][0])]).reverse();
    const d = `${smooth(top)} L${bot[0][0]},${bot[0][1]} ${smooth(bot).slice(1).replace(/^[^C]*/, "")} Z`;
    return { c, d, top };
  });

  const ink = dark ? "#EAF3F8" : "#0C2235";
  const sub = dark ? "rgba(234,243,248,0.6)" : "#5E7486";
  const labelFor = (i, k) => {
    const [lo, hi] = cum[i][k];
    return { yMid: y((lo + hi) / 2), pct: hi - lo };
  };

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      <svg width={w} height={height} role="img" aria-label="Share of the study area in each class on each date" className="block">
        {bands.map((b) => (
          <path
            key={b.c}
            d={b.d}
            fill={classColor(b.c, dark ? "dark" : "ui")}
            fillOpacity={b.c === "Glacier" ? (dark ? 0.9 : 0.55) : b.c === "Glacial Lake" ? 0.95 : dark ? 0.75 : 0.82}
            stroke={dark ? "#071522" : "#F5F8FA"}
            strokeWidth="1.5"
          />
        ))}

        {points.map((p, i) => (
          <g key={p.label}>
            <line x1={x(i)} x2={x(i)} y1={m.top} y2={m.top + ph} stroke={dark ? "#071522" : "#F5F8FA"} strokeOpacity="0.55" strokeWidth="1" />
            <text
              x={x(i)}
              y={height - 9}
              textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
              fill={p.flag ? (dark ? "#FF694F" : "#D4442B") : sub}
              fontSize="11"
              fontFamily="DM Mono, monospace"
              className={narrow && i % 2 === 1 && i !== n - 1 ? "hidden" : ""}
            >
              {p.label}
            </text>
          </g>
        ))}

        {!narrow &&
          order.map((c, k) => {
            const a = labelFor(0, k);
            const z = labelFor(n - 1, k);
            const thin = a.pct < 6;
            return (
              <g key={c} fontFamily="Manrope Variable, Manrope, sans-serif">
                <text x={m.left - 10} y={thin ? a.yMid - 6 : a.yMid - 2} textAnchor="end" fill={ink} fontSize="12.5" fontWeight="600">
                  {c === "Non-Glacier Land" ? "Land" : c === "Glacial Lake" ? "Lake" : c}
                </text>
                <text x={m.left - 10} y={thin ? a.yMid + 8 : a.yMid + 13} textAnchor="end" fill={sub} fontSize="11.5" fontFamily="DM Mono, monospace">
                  {formatPct(a.pct, 1)}
                </text>
                <text x={w - m.right + 10} y={z.yMid + 4} fill={ink} fontSize="12" fontFamily="DM Mono, monospace">
                  {formatPct(z.pct, 1)}
                </text>
              </g>
            );
          })}

        {hover !== null && (
          <line x1={x(hover)} x2={x(hover)} y1={m.top} y2={m.top + ph} stroke={ink} strokeWidth="1.25" />
        )}
        <rect
          x={m.left}
          y={m.top}
          width={pw}
          height={ph}
          fill="transparent"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left) / pw) * (n - 1)))));
          }}
          onMouseLeave={() => setHover(null)}
        />
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 min-w-[190px] bg-midnight px-3.5 py-2.5 text-[12.5px] text-white shadow-lift"
          style={{ top: m.top + 8, left: x(hover) > w * 0.6 ? undefined : x(hover) + 12, right: x(hover) > w * 0.6 ? w - x(hover) + 12 : undefined }}
        >
          <p className="mb-1 font-mono text-ice">{points[hover].label}</p>
          {[...order].reverse().map((c) => (
            <div key={c} className="flex justify-between gap-5 text-white/75">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: classColor(c, "dark") }} />
                {c}
              </span>
              <span className="tabular font-mono text-white">{formatPct(points[hover].shares[c], 2)}</span>
            </div>
          ))}
          {points[hover].flag && <p className="mt-1 text-coral">{points[hover].flag}</p>}
        </div>
      )}
    </div>
  );
}
