import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import ShareRibbon from "../components/charts/ShareRibbon";
import { assetUrl, fetchKMeansResults, fetchMarkovResults } from "../services/api";
import useApi from "../services/useApi";
import { formatDate, formatInt, formatNum, formatPct } from "../utils/format";

const HEADLINE = ["Understanding", "a landscape", "in change."];

function Hero() {
  const reduce = useReducedMotion();
  const line = (i) =>
    reduce
      ? {}
      : {
          initial: { y: "105%" },
          animate: { y: "0%" },
          transition: { delay: 0.25 + i * 0.12, duration: 0.9, ease: [0.22, 1, 0.36, 1] },
        };
  const after = (d) => (reduce ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.7 } });

  return (
    <section className="relative isolate flex min-h-[640px] items-end overflow-hidden bg-midnight text-white" style={{ height: "92vh" }}>
      <motion.picture
        className="absolute inset-0 -z-20 block"
        initial={reduce ? false : { scale: 1.08 }}
        animate={{ scale: 1 }}
        transition={{ duration: 16, ease: "easeOut" }}
      >
        <img
          src="/images/hero-landscape-1440.jpg"
          srcSet="/images/hero-landscape-1440.jpg 1440w, /images/hero-landscape.jpg 2560w"
          sizes="100vw"
          alt=""
          className="h-full w-full object-cover object-[50%_55%]"
        />
      </motion.picture>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-midnight/80 via-midnight/25 to-transparent" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-midnight/75 via-transparent to-transparent" />

      <div className="page-x pb-[11vh] pt-32">
        <motion.p {...after(0.15)} className="meta text-ice">
          North Sikkim, Himalayas <span className="mx-2 text-white/35">|</span> Sentinel-2{" "}
          <span className="mx-2 text-white/35">|</span> 2025
        </motion.p>
        <h1 className="display mt-6 text-display-xl text-white">
          {HEADLINE.map((t, i) => (
            <span key={t} className="block overflow-hidden pb-[0.04em]">
              <motion.span className="block" {...line(i)}>
                {t}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p {...after(0.8)} className="mt-7 max-w-xl text-[18px] leading-relaxed text-white/80 sm:text-[20px]">
          Exploring glacier, glacial lake and non-glacier land through Sentinel-2 satellite imagery and machine
          learning.
        </motion.p>
        <motion.div {...after(0.95)} className="mt-10 flex flex-wrap gap-3">
          <Link to="/kmeans" className="btn btn-coral">
            Explore U3 – K-Means
          </Link>
          <Link to="/markov" className="btn btn-ghost-dark">
            Explore U4 – Markov
          </Link>
        </motion.div>
      </div>

      <p className="absolute bottom-5 right-5 font-mono text-[10.5px] text-white/40 sm:right-8 lg:right-12">
        Illustrative render — not a photograph of Shako Cho
      </p>
    </section>
  );
}

function Pending({ error, className = "" }) {
  return (
    <div className={`flex items-center justify-center bg-midnight/95 px-8 text-center ${className}`}>
      <p className="max-w-xs font-mono text-[12.5px] leading-relaxed text-white/55">
        {error ? `${error} The maps appear once the backend is running.` : "Loading maps from the backend…"}
      </p>
    </div>
  );
}

function KMeansFeature() {
  const { data, error } = useApi(fetchKMeansResults);
  const dates = data?.maps.dates || [];
  const [sel, setSel] = useState(null);
  const current = dates.find((d) => d.date === sel) || dates[0];
  const o = data?.evaluation.overall;

  return (
    <section className="relative overflow-hidden bg-snow py-24 sm:py-32">
      <div className="page-x grid items-center gap-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="relative -mx-5 sm:mx-0">
            {current ? (
              <div className="mx-auto max-w-[620px] bg-midnight p-4 shadow-lift sm:p-6">
                <img
                  key={current.date}
                  src={assetUrl(current.image_url)}
                  alt={`K-Means classified map of the Shako basin, ${formatDate(current.date)}`}
                  className="mx-auto block h-auto w-full max-w-[560px]"
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div role="group" aria-label="Map date" className="flex flex-wrap gap-1">
                    {dates.map((d) => (
                      <button
                        key={d.date}
                        onClick={() => setSel(d.date)}
                        aria-pressed={d.date === current.date}
                        className={`rounded-sm px-2 py-1 font-mono text-[11.5px] transition-colors ${
                          d.date === current.date ? "bg-white text-midnight" : "text-white/60 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {formatDate(d.date, { year: false })}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                  {[
                    ["#A9A9A9", "Glacier"],
                    ["#0074D9", "Cluster 2 (mixed)"],
                    ["#8B4513", "Non-Glacier Land"],
                  ].map(([c, l]) => (
                    <span key={l} className="flex items-center gap-2 text-[12.5px] text-white/75">
                      <span className="h-2.5 w-2.5" style={{ backgroundColor: c }} />
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <Pending error={error} className="aspect-[490/591] max-h-[620px] w-full shadow-lift" />
            )}
          </div>
        </div>

        <div className="lg:col-span-5">
          <p className="font-mono text-[13px] text-coral-ink">U3 — unsupervised classification</p>
          <h2 className="display mt-4 text-[clamp(2.6rem,4.4vw,4.75rem)] leading-[0.95] text-navy">From pixels to patterns.</h2>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-muted">
            K-Means sees only reflectance and two spectral indices — never a label. Grouping every sample point
            into three clusters shows how much of the glacier, lake and land structure the spectra carry on their own.
          </p>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
            {[
              ["Sample points", data ? formatInt(data.dataset.total_points) : "—"],
              ["Clusters", data ? `K = ${data.settings.n_clusters}` : "—"],
              ["Agreement", o ? formatPct(o.oa, 2) : "—"],
            ].map(([k, v]) => (
              <div key={k} className="border-t-2 border-navy pt-3">
                <dd className="tabular font-mono text-[22px] text-navy">{v}</dd>
                <dt className="mt-1 text-[13px] text-muted">{k}</dt>
              </div>
            ))}
          </dl>
          <Link to="/kmeans" className="btn btn-ghost-light mt-10">
            Explore U3 – K-Means
          </Link>
        </div>
      </div>
    </section>
  );
}

function MarkovFeature() {
  const { data, error } = useApi(fetchMarkovResults);
  const ch = data?.change;
  const anomaly = data?.forecast.anomaly;
  const top = ch?.map.legend.filter((l) => l.changed).sort((a, b) => b.km2 - a.km2).slice(0, 2) || [];

  return (
    <section className="relative overflow-hidden bg-frost py-24 sm:py-32">
      <div className="page-x grid items-center gap-14 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="font-mono text-[13px] text-coral-ink">U4 — sequential change analysis</p>
          <h2 className="display mt-4 text-[clamp(2.6rem,4.4vw,4.75rem)] leading-[0.95] text-navy">A landscape in motion.</h2>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-muted">
            Nine classified maps, five days apart, are compared pixel by pixel. A first-order Markov chain turns
            those transitions into rates — then tests them, and runs them forward.
          </p>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
            {[
              ["Changed class", ch ? `${formatNum(ch.changed_km2, 2)} km²` : "—"],
              ["Of study area", ch ? formatPct(ch.changed_pct, 1) : "—"],
              ["Validation error", data ? formatPct(data.validation.total_abs_error_pct, 2) : "—"],
            ].map(([k, v]) => (
              <div key={k} className="border-t-2 border-navy pt-3">
                <dd className="tabular font-mono text-[22px] text-navy">{v}</dd>
                <dt className="mt-1 text-[13px] text-muted">{k}</dt>
              </div>
            ))}
          </dl>
          <Link to="/markov" className="btn btn-ghost-light mt-10">
            Explore U4 – Markov
          </Link>
        </div>

        <div className="lg:col-span-7">
          {ch?.map.image_url ? (
            <figure className="mx-auto max-w-[620px] bg-midnight p-4 shadow-lift sm:p-6">
              <img
                src={assetUrl(ch.map.image_url)}
                alt={`Change map from ${formatDate(ch.first_date)} to ${formatDate(ch.last_date)}`}
                className="mx-auto block h-auto w-full max-w-[560px]"
              />
              <figcaption className="mt-4 space-y-2">
                <p className="font-mono text-[11.5px] text-white/50">
                  Change map, {formatDate(ch.first_date)} → {formatDate(ch.last_date)}
                </p>
                <div className="flex flex-wrap gap-x-5 gap-y-1">
                  {top.map((l) => (
                    <span key={l.code} className="flex items-center gap-2 text-[12.5px] text-white/80">
                      <span className="h-2.5 w-2.5" style={{ backgroundColor: l.color }} />
                      {l.label} · {formatNum(l.km2, 2)} km²
                    </span>
                  ))}
                  <span className="flex items-center gap-2 text-[12.5px] text-white/55">
                    <span className="h-2.5 w-2.5 bg-[#E0E0E0]" />
                    pale = unchanged
                  </span>
                </div>
              </figcaption>
            </figure>
          ) : (
            <Pending error={error} className="aspect-[540/650] max-h-[620px] w-full shadow-lift" />
          )}
        </div>
      </div>

      {data && (
        <div className="page-x mt-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h3 className="font-serif text-[30px] font-medium leading-tight text-navy">
              How the basin was divided on each date
            </h3>
            <p className="font-mono text-[12px] text-muted">Share of the {formatNum(data.grid.study_area_km2, 2)} km² study area</p>
          </div>
          <div className="mt-6">
            <ShareRibbon
              points={data.observations.map((o) => ({
                label: formatDate(o.date, { year: false }),
                shares: o.share_pct,
                flag: o.date === anomaly.date ? "Lake classification anomaly" : undefined,
              }))}
              height={280}
            />
          </div>
          <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-muted">
            The snow-and-ice class shrinks from {formatPct(data.observations[0].share_pct.Glacier, 1)} to{" "}
            {formatPct(data.observations[data.observations.length - 1].share_pct.Glacier, 1)} of the area while land grows to
            match. The lake holds steady except on {formatDate(anomaly.date, { year: false })}, when part of it was mapped as
            glacier. U4 follows each of those changes step by step.
          </p>
        </div>
      )}
    </section>
  );
}

export default function Home() {
  return (
    <>
      <Hero />
      <KMeansFeature />
      <MarkovFeature />
    </>
  );
}
