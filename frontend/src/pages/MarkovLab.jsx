import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import LabPage from "../components/LabPage";
import ParticleField from "../components/ParticleField";
import ObservationsStep from "../components/markov/ObservationsStep";
import TransitionsStep from "../components/markov/TransitionsStep";
import MatrixStep from "../components/markov/MatrixStep";
import AreaStep from "../components/markov/AreaStep";
import ChangeStep from "../components/markov/ChangeStep";
import ValidationStep from "../components/markov/ValidationStep";
import ForecastStep from "../components/markov/ForecastStep";
import { MarkovSelection } from "../components/markov/selection";
import { fetchMarkovResults, rerunMarkov } from "../services/api";
import { formatDate, formatInt, formatNum, formatPct } from "../utils/format";

/** Stages; each summary line is read from that stage's slice of GET /u4/results. */
function buildStages(d) {
  const obs = d.observations;
  const P = d.markov.P;
  const h = d.areas.highlights;
  const fc = d.forecast.series;
  return [
    {
      nav: "Observations",
      name: "Sequential Satellite Observations",
      summary: `${obs.length} classified maps · ${obs[0].label} → ${obs[obs.length - 1].label} 2025`,
      render: () => <ObservationsStep data={d} />,
    },
    {
      nav: "Transitions",
      name: "Pixel Transition Detection",
      summary: `${d.transitions.periods.length} intervals of ${d.settings.step_days} days compared`,
      render: () => <TransitionsStep data={d} />,
    },
    {
      nav: "Probability matrix",
      name: "Markov Transition Matrix",
      summary: `Persistence ${P.map((r, i) => formatNum(r[i], 3)).join(" / ")}`,
      render: () => <MatrixStep data={d} />,
    },
    {
      nav: "Area changes",
      name: "Change in Surface Areas",
      summary: `Glacier ${formatNum(h.glacier[0], 2)} → ${formatNum(h.glacier[1], 2)} km²`,
      render: () => <AreaStep data={d} />,
    },
    {
      nav: "Change detection",
      name: "Change Detection Results",
      summary: `${formatNum(d.change.changed_km2, 2)} km² changed · ${formatPct(d.change.changed_pct, 1)}`,
      render: () => <ChangeStep data={d} />,
    },
    {
      nav: "Validation",
      name: "Model Validation",
      summary: `${formatPct(d.validation.total_abs_error_pct, 2)} error vs ${formatPct(d.validation.baseline_error_pct, 2)} baseline`,
      render: () => <ValidationStep data={d} />,
    },
    {
      nav: "Forecast",
      name: "Forecast and Conclusion",
      summary: `${fc.length} steps to ${formatDate(fc[fc.length - 1].date)}`,
      render: () => <ForecastStep data={d} />,
    },
  ];
}

/** The nine observation dates as a selectable horizontal sequence; the gaps between them are the intervals. */
function HeroTimeline({ data, sel, api }) {
  const obs = data.observations;
  const anomaly = data.forecast.anomaly;
  const maxG = Math.max(...obs.map((o) => o.area_km2.Glacier));

  return (
    <div className="relative">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[12px] text-white/60">
          Nine observations, {data.settings.step_days} days apart — select a date or an interval
        </p>
        <p className="hidden font-mono text-[12px] text-white/45 sm:block">Bars: Glacier class area (km²)</p>
      </div>
      <div className="overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ol className="relative flex min-w-[720px] items-end" aria-label="Observation dates and intervals">
          {obs.map((o, i) => {
            const isDate = sel.date === o.date;
            const isAnom = anomaly.date === o.date;
            const g = o.area_km2.Glacier;
            return (
              <li key={o.date} className="relative flex flex-1 flex-col items-center">
                {/* glacier-area bar (real data) */}
                <div className="flex h-16 items-end" aria-hidden="true">
                  <div
                    className={`w-2.5 transition-colors ${isDate ? "bg-coral" : "bg-ice/55"}`}
                    style={{ height: `${(g / maxG) * 100}%` }}
                  />
                </div>
                <span className="tabular mt-1 font-mono text-[10.5px] text-white/50">{formatNum(g, 2)}</span>

                {/* interval segment to the next date */}
                {i < obs.length - 1 && (
                  <button
                    onClick={() => {
                      sel.setInterval(i);
                      api.selectStage(1, { scroll: "always" });
                    }}
                    aria-label={`Interval ${o.label} to ${obs[i + 1].label}`}
                    aria-pressed={sel.interval === i}
                    className="group absolute left-[calc(50%+14px)] top-[94px] z-20 h-6 w-[calc(100%-28px)]"
                  >
                    <span
                      className={`absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 transition-all group-hover:h-[3px] ${
                        sel.interval === i
                          ? "bg-cyan"
                          : anomaly.period_index === i
                          ? "bg-coral/60 group-hover:bg-coral"
                          : "bg-white/25 group-hover:bg-white/70"
                      }`}
                    />
                  </button>
                )}

                <button
                  onClick={() => {
                    sel.setDate(o.date);
                    api.selectStage(0, { scroll: "always" });
                  }}
                  aria-pressed={isDate}
                  aria-label={`${formatDate(o.date)}${isAnom ? " — lake classification anomaly" : ""}`}
                  className="group relative z-10 mt-3 flex flex-col items-center"
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                      isDate ? "border-coral bg-coral" : isAnom ? "border-coral bg-midnight" : "border-white/70 bg-midnight group-hover:border-white"
                    }`}
                  >
                    {isAnom && !isDate && <span className="h-1.5 w-1.5 rounded-full bg-coral" />}
                  </span>
                  <span
                    className={`mt-2.5 whitespace-nowrap font-mono text-[12.5px] uppercase tracking-[0.1em] ${
                      isDate ? "text-white" : "text-white/70 group-hover:text-white"
                    }`}
                  >
                    {formatDate(o.date, { year: false }).replace(/^(\d) /, "0$1 ")}
                  </span>
                  {isAnom ? (
                    <span className="mt-1 flex items-center gap-1 font-mono text-[10.5px] text-coral">
                      <AlertTriangle className="h-3 w-3" strokeWidth={2} /> anomaly
                    </span>
                  ) : (
                    <span className="mt-1 font-mono text-[10.5px] text-white/35">{i === 0 ? "day 0" : `+${i * data.settings.step_days}d`}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Hero({ data, api, sel }) {
  const reduce = useReducedMotion();
  const fade = (delay) => (reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.7 } });

  return (
    <section className="relative isolate overflow-hidden bg-midnight text-white">
      <motion.img
        src="/images/hero-aerial-1440.jpg"
        srcSet="/images/hero-aerial-1440.jpg 1440w, /images/hero-aerial.jpg 2560w"
        sizes="100vw"
        alt=""
        className="absolute inset-0 -z-20 h-full w-full object-cover object-[50%_40%]"
        initial={reduce ? false : { scale: 1.07 }}
        animate={{ scale: 1 }}
        transition={{ duration: 18, ease: "easeOut" }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-midnight/85 via-midnight/45 to-midnight" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-midnight/70 to-transparent" />
      <ParticleField className="-z-10 opacity-70" />

      <div className="page-x flex min-h-[92vh] flex-col justify-between gap-12 pb-10 pt-28">
        <div className="max-w-5xl">
          <motion.p {...fade(0.05)} className="meta text-ice">
            U4 <span className="mx-2 text-white/35">|</span> Sequential change detection using Markov chains
          </motion.p>
          <motion.h1 {...fade(0.15)} className="display mt-5 text-[clamp(3.2rem,7.4vw,7.5rem)] leading-[0.9] text-white">
            <span className="block">A landscape</span>
            <span className="block">in motion.</span>
          </motion.h1>
          <motion.p {...fade(0.3)} className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/80">
            This experiment uses a first-order Markov chain to study how classified surface pixels change across nine
            consecutive Sentinel-2 observation dates.
          </motion.p>
          <motion.p {...fade(0.4)} className="tabular mt-5 font-mono text-[13.5px] text-ice">
            <span className="whitespace-nowrap">{data ? data.observations.length : "—"} observations</span>
            <span className="mx-2 text-white/35">|</span>
            <span className="whitespace-nowrap">{data ? `${data.settings.step_days}-day step` : "—"}</span>
            <span className="mx-2 text-white/35">|</span>
            <span className="whitespace-nowrap">{data ? formatInt(data.grid.valid_pixels) : "—"} pixels followed</span>
          </motion.p>
          <motion.div {...fade(0.5)} className="mt-8">
            <button onClick={() => api.selectStage(0, { scroll: "always" })} disabled={!api.stagesReady} className="btn btn-coral">
              Explore the pipeline
            </button>
          </motion.div>
        </div>

        {data && (
          <motion.div {...fade(0.6)}>
            <HeroTimeline data={data} sel={sel} api={api} />
          </motion.div>
        )}
      </div>
    </section>
  );
}

export default function MarkovLab() {
  const [date, setDate] = useState(null);
  const [interval, setInterval] = useState(0);
  const sel = useMemo(() => ({ date, setDate, interval, setInterval }), [date, interval]);

  return (
    <MarkovSelection.Provider value={sel}>
      <LabPage
        endpoint="/u4/results"
        fetchResults={fetchMarkovResults}
        rerunResults={rerunMarkov}
        loadingMessage="Loading the Markov chain results from the notebook outputs…"
        rerunMessage="Rerunning the Markov analysis from the classified GeoTIFFs…"
        buildStages={buildStages}
        renderHero={(data, api) => <Hero data={data} api={api} sel={sel} />}
      />
    </MarkovSelection.Provider>
  );
}
