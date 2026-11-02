import { AlertTriangle, ImageOff } from "lucide-react";
import { assetUrl } from "../../services/api";
import { ClassName, Narrative, Section, Split, StatGrid, WhatHappened, WhyPerformed } from "../StageDetails";
import { useMarkovSelection } from "./selection";
import { classColor } from "../../utils/classes";
import { formatDate, formatInt, formatNum, formatPct } from "../../utils/format";

/** Horizontal, evenly spaced timeline of the observation dates (5-day steps). */
export function DateTimeline({ observations, selected, onSelect, flagged, stepDays }) {
  return (
    <div className="overflow-x-auto pb-2">
      <ol className="relative flex min-w-[640px]" aria-label="Observation dates">
        <span aria-hidden="true" className="absolute left-[5.5%] right-[5.5%] top-[11px] h-[2px] bg-silver" />
        {observations.map((o, i) => {
          const active = o.date === selected;
          const flag = flagged === o.date;
          return (
            <li key={o.date} className="relative flex flex-1 flex-col items-center">
              <button
                onClick={() => onSelect(o.date)}
                aria-pressed={active}
                aria-label={`${formatDate(o.date)}${flag ? " (lake anomaly)" : ""}`}
                className="group flex flex-col items-center gap-2.5"
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                    active ? "border-navy bg-navy" : flag ? "border-coral bg-snow" : "border-faint bg-snow group-hover:border-navy"
                  }`}
                >
                  {active && <span className="h-2 w-2 rounded-full bg-coral" />}
                  {!active && flag && <span className="h-2 w-2 rounded-full bg-coral" />}
                </span>
                <span className={`whitespace-nowrap font-mono text-[13px] uppercase tracking-[0.06em] ${active ? "font-medium text-navy" : "text-muted group-hover:text-navy"}`}>
                  {o.label}
                </span>
                <span className={`font-mono text-[11px] ${flag ? "text-coral-ink" : "text-faint"}`}>
                  {flag ? "anomaly" : i === 0 ? "day 0" : `+${i * stepDays}d`}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function ObservationsStep({ data }) {
  const obs = data.observations;
  const g = data.grid;
  const anomaly = data.forecast.anomaly;
  const sel = useMarkovSelection();
  const o = obs.find((x) => x.date === sel.date) || obs[0];
  const idx = obs.indexOf(o);
  const prev = obs[idx - 1];
  const total = o.total_km2;

  return (
    <>
      <StatGrid
        items={[
          ["Classified maps", obs.length],
          ["Markov step", `${data.settings.step_days} days`],
          ["Classifier", data.settings.model_title],
          ["Map grid", `${g.rows} × ${g.cols} px`],
          ["Pixels used (all dates)", formatInt(g.valid_pixels)],
          ["Study area", `${formatNum(g.study_area_km2, 2)} km²`],
        ]}
      />

      <WhatHappened>
        <p>
          The input is not raw imagery: it is nine maps that were <strong>already classified</strong> by the project's{" "}
          {data.settings.model_title} model, one Sentinel-2 date every {data.settings.step_days} days from {formatDate(obs[0].date)}{" "}
          to {formatDate(obs[obs.length - 1].date)}. The notebook stacked them into one array (dates × {g.rows} × {g.cols}) and
          kept only the {formatInt(g.valid_pixels)} of {formatInt(g.total_pixels)} pixels that have a class on every date, so the
          same pixels are followed through time. Each pixel is about {formatNum(g.pixel_size_m, 1)} m across; its exact area
          (km²) was computed from the map's latitude.
        </p>
      </WhatHappened>

      <Section title="Observation timeline" hint="Select a date">
        <DateTimeline
          observations={obs}
          selected={o.date}
          onSelect={sel.setDate}
          flagged={anomaly?.date}
          stepDays={data.settings.step_days}
        />
      </Section>

      <Split
        narrative={
          <Narrative title={formatDate(o.date)}>
            <p>
              Observation {idx + 1} of {obs.length}.{" "}
              {prev ? `Change since ${prev.label} is shown beside each area.` : "The first map: the starting state of the chain."}
            </p>
            {anomaly?.date === o.date && (
              <p className="flex gap-2 border-l-[3px] border-coral bg-coral-soft/70 px-3 py-2 text-coral-ink">
                <AlertTriangle className="mt-1 h-4 w-4 shrink-0" />
                Lake classification anomaly: the lake is mapped at {formatNum(anomaly.lake_area_km2, 2)} km² on this date.
              </p>
            )}
          </Narrative>
        }
      >
        <div className="grid gap-10 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <div className="space-y-7" aria-live="polite">
            {Object.entries(o.area_km2).map(([name, km2]) => {
              const delta = prev ? km2 - prev.area_km2[name] : null;
              return (
                <div key={name}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[15px] font-semibold text-ink">
                      <ClassName name={name} />
                    </span>
                    <span className="tabular font-mono text-[24px] text-navy">
                      {formatNum(km2, 3)}
                      <span className="ml-1 text-[13px] text-muted">km²</span>
                    </span>
                  </div>
                  <div className="mt-2 h-3 bg-raised">
                    <div className="h-full transition-[width] duration-500" style={{ width: `${(km2 / total) * 100}%`, backgroundColor: classColor(name) }} />
                  </div>
                  <div className="mt-1.5 flex justify-between font-mono text-[12px]">
                    <span className="text-faint">{formatPct(o.share_pct[name], 2)} of the study area</span>
                    {delta !== null && (
                      <span className={Math.abs(delta) > 0.2 ? "text-coral-ink" : "text-faint"}>
                        {delta >= 0 ? "+" : "−"}
                        {Math.abs(delta).toFixed(3)} km² vs {prev.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {o.map_url ? (
            <figure className="bg-midnight p-4 shadow-lift">
              <img
                src={assetUrl(o.map_url)}
                alt={`${data.settings.model_title} classified map, ${formatDate(o.date)}`}
                className="mx-auto block h-auto w-full max-w-[380px]"
                style={{ imageRendering: "pixelated" }}
              />
              <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                {data.classes.map((c) => (
                  <span key={c.code} className="flex items-center gap-1.5 text-[12px] text-white/75">
                    <span className="h-2.5 w-2.5" style={{ backgroundColor: c.color }} />
                    {c.name}
                  </span>
                ))}
              </figcaption>
            </figure>
          ) : (
            <div className="flex flex-col justify-center gap-3 bg-midnight px-7 py-9 text-white shadow-lift">
              <ImageOff className="h-5 w-5 text-white/50" strokeWidth={1.5} />
              <p className="font-serif text-[22px] font-medium leading-tight">Classified map not available</p>
              <p className="text-[13.5px] leading-relaxed text-white/60">
                The notebook reads <span className="font-mono text-white/80">classified_Sentinel2_{o.date}.tif</span> from disk and
                never plots it, so no image of this map exists in the uploaded files. Place the nine GeoTIFFs in{" "}
                <span className="font-mono text-white/80">{data.source.rerun.input_dir}</span> to display them here.
              </p>
            </div>
          )}
        </div>
      </Split>

      <Section title="Class codes in the classified maps">
        <div className="grid grid-cols-2 gap-px bg-silver lg:grid-cols-4">
          {[...data.classes, { code: 0, name: "No data", color: "#000000" }].map((c) => (
            <div key={c.code} className="flex items-center gap-4 bg-snow py-5 pr-4">
              <span className="font-serif text-[48px] font-medium leading-none text-navy">{c.code}</span>
              <span className="flex items-center gap-2 text-[15px] text-ink">
                <span className="h-3 w-3 border border-black/10" style={{ backgroundColor: c.color }} />
                {c.name}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <WhyPerformed>
        A Markov chain models how a system moves between a fixed set of states over equal time steps. The classified maps
        provide exactly that: three states (the class codes) observed at nine equally spaced dates. Restricting the analysis
        to pixels valid on every date means every transition counted later compares the same ground location with itself.
      </WhyPerformed>
    </>
  );
}
