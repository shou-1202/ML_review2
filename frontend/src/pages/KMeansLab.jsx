import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import LabPage from "../components/LabPage";
import DatasetStep from "../components/kmeans/DatasetStep";
import KSelectionStep from "../components/kmeans/KSelectionStep";
import ClusteringStep from "../components/kmeans/ClusteringStep";
import InterpretationStep from "../components/kmeans/InterpretationStep";
import EvaluationStep from "../components/kmeans/EvaluationStep";
import MapsStep from "../components/kmeans/MapsStep";
import { assetUrl, fetchKMeansResults, rerunKMeans } from "../services/api";
import { classShort } from "../utils/classes";
import { formatDate, formatInt, formatNum, formatPct } from "../utils/format";

/** Stages; each summary line is read from that stage's slice of GET /u3/results. */
function buildStages(d) {
  const ks = d.k_selection;
  const sel = ks.rows.find((r) => r.k === ks.selected_k);
  const o = d.evaluation.overall;
  return [
    {
      nav: "Data",
      name: "Dataset and Feature Preparation",
      summary: `${d.dataset.n_dates} dates · ${formatInt(d.dataset.total_points)} points · ${d.dataset.features.length} features`,
      render: () => <DatasetStep data={d} />,
    },
    {
      nav: "Features",
      name: "Feature Standardisation and K Selection",
      summary: `k = ${ks.rows[0].k}–${ks.rows[ks.rows.length - 1].k} tested · k = ${ks.selected_k} (silhouette ${formatNum(sel.silhouette, 3)})`,
      render: () => <KSelectionStep data={d} />,
    },
    {
      nav: "Clustering",
      name: "K-Means Clustering",
      summary: `${d.settings.n_clusters} clusters · ${d.clusters.map((c) => formatPct(c.share, 1)).join(" / ")}`,
      render: () => <ClusteringStep data={d} />,
    },
    {
      nav: "Interpretation",
      name: "Cluster Interpretation",
      summary: d.clusters
        .map((c) => `C${c.id} ${c.interpretation === c.assigned_class ? classShort(c.assigned_class) : "Mixed"}`)
        .join(" · "),
      render: () => <InterpretationStep data={d} />,
    },
    {
      nav: "Evaluation",
      name: "Classification Evaluation",
      summary: `${formatPct(o.oa, 2)} agreement · κ ${formatNum(o.kappa, 3)}`,
      render: () => <EvaluationStep data={d} />,
    },
    {
      nav: "Classification maps",
      name: "Classification Maps and Final Result",
      summary: `${d.maps.dates.length} classified maps`,
      render: () => <MapsStep data={d} />,
    },
  ];
}

/** The real K-Means maps, cycling slowly through the nine dates. */
function HeroMap({ dates }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduce || paused || dates.length < 2) return undefined;
    const t = setInterval(() => setI((k) => (k + 1) % dates.length), 3200);
    return () => clearInterval(t);
  }, [reduce, paused, dates.length]);

  const d = dates[i];
  return (
    <figure onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="relative">
      <div className="relative mx-auto aspect-[479/578] w-full max-w-[520px]">
        {/* tick frame */}
        <div className="pointer-events-none absolute -inset-3 border border-white/15" aria-hidden="true">
          {[0, 25, 50, 75, 100].map((p) => (
            <span key={`t${p}`} className="absolute -top-px h-2 w-px bg-white/40" style={{ left: `${p}%` }} />
          ))}
          {[0, 25, 50, 75, 100].map((p) => (
            <span key={`l${p}`} className="absolute -left-px h-px w-2 bg-white/40" style={{ top: `${p}%` }} />
          ))}
        </div>
        <AnimatePresence initial={false}>
          <motion.img
            key={d.date}
            src={assetUrl(d.image_url)}
            alt={`K-Means classified map, ${formatDate(d.date)}`}
            className="absolute inset-0 h-full w-full"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.9 }}
          />
        </AnimatePresence>
      </div>
      <figcaption className="mx-auto mt-6 flex max-w-[520px] flex-wrap items-center justify-between gap-3 font-mono text-[12px] text-white/60">
        <span>
          K-Means classification <span className="text-white">{formatDate(d.date)}</span>
        </span>
        <span className="flex gap-1" aria-hidden="true">
          {dates.map((x, k) => (
            <span key={x.date} className={`h-1 w-3 ${k === i ? "bg-coral" : "bg-white/20"}`} />
          ))}
        </span>
      </figcaption>
    </figure>
  );
}

function Hero({ data, api }) {
  const reduce = useReducedMotion();
  const fade = (delay) => (reduce ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.7 } });
  return (
    <section
      className="relative isolate overflow-hidden bg-midnight text-white"
      style={{
        backgroundImage:
          "linear-gradient(rgba(169,217,243,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(169,217,243,0.05) 1px, transparent 1px)",
        backgroundSize: "64px 64px",
      }}
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_45%,rgba(85,185,232,0.16),transparent_60%)]" />
      <div className="page-x grid min-h-[86vh] items-center gap-14 pb-20 pt-32 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <motion.p {...fade(0.05)} className="meta text-ice">
            U3 <span className="mx-2 text-white/35">|</span> Unsupervised surface classification
          </motion.p>
          <motion.h1 {...fade(0.15)} className="display mt-6 text-[clamp(2.8rem,5.6vw,6rem)] leading-[0.92] text-white">
            <span className="block">From pixels</span>
            <span className="block">to patterns.</span>
          </motion.h1>
          <motion.p {...fade(0.3)} className="mt-7 max-w-lg text-[17px] leading-relaxed text-white/75">
            This experiment uses unsupervised learning to group Sentinel-2 pixels based on their spectral
            characteristics and examine how these groups correspond to Glacier, Glacial Lake and Non-Glacier Land.
          </motion.p>
          <motion.p {...fade(0.4)} className="tabular mt-8 font-mono text-[13.5px] text-ice">
            <span className="whitespace-nowrap">{data ? formatInt(data.dataset.total_points) : "—"} samples</span>
            <span className="mx-2 text-white/35">|</span>
            <span className="whitespace-nowrap">{data ? data.dataset.n_dates : "—"} observations</span>
            <span className="mx-2 text-white/35">|</span>
            <span className="whitespace-nowrap">K = {data ? data.settings.n_clusters : "—"}</span>
          </motion.p>
          <motion.div {...fade(0.5)} className="mt-10">
            <button onClick={() => api.selectStage(0, { scroll: "always" })} disabled={!api.stagesReady} className="btn btn-coral">
              Explore the pipeline
            </button>
          </motion.div>
        </div>
        <div className="lg:col-span-5">
          {data ? (
            <HeroMap dates={data.maps.dates} />
          ) : (
            <div className="mx-auto aspect-[479/578] w-full max-w-[520px] border border-white/10 bg-white/[0.03]" />
          )}
        </div>
      </div>
    </section>
  );
}

export default function KMeansLab() {
  return (
    <LabPage
      endpoint="/u3/results"
      fetchResults={fetchKMeansResults}
      rerunResults={rerunKMeans}
      loadingMessage="Loading the K-Means results from the notebook outputs…"
      rerunMessage="Rerunning K-Means on all sample points (10 restarts, k = 2–8)… this can take a minute…"
      buildStages={buildStages}
      renderHero={(data, api) => <Hero data={data} api={api} />}
    />
  );
}
