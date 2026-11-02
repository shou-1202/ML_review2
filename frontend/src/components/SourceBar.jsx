import { Loader2, RotateCcw } from "lucide-react";

/**
 * Data provenance band: where the numbers on the page come from, and whether
 * the notebook processing can be re-executed. Rerunning needs the raw inputs
 * (CSVs / GeoTIFFs), which are not part of the notebooks, so the button only
 * appears when the backend reports them as present.
 */
export default function SourceBar({ endpoint, source, onRerun, rerunning, rerunError, onShowReference }) {
  if (!source) return null;
  const rerun = source.rerun;
  const isRerun = source.kind === "rerun";

  return (
    <section className="border-t border-silver bg-frost/50">
      <div className="page-x grid gap-8 py-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <h2 className="font-serif text-[26px] font-medium leading-tight text-navy">
            {isRerun ? "Rerun from source data" : "Where these results come from"}
          </h2>
          <p className="mt-2 font-mono text-[12.5px] text-muted">GET {endpoint}</p>
        </div>
        <div className="space-y-3 text-[14.5px] leading-relaxed text-muted md:col-span-8">
          <p>
            <span className="font-mono text-[13px] text-navy">{source.notebook}</span> — {source.description}
          </p>
          {!rerun.available && (
            <p className="text-faint">
              Rerunning the processing requires the original inputs, which are not included with the notebook:{" "}
              <span className="text-muted">{rerun.expected}</span> in{" "}
              <span className="font-mono text-[13px] text-muted">{rerun.input_dir}</span>.
            </p>
          )}
          {rerunError && (
            <p className="border-l-2 border-coral pl-3 text-coral-ink" role="alert">
              {rerunError}
            </p>
          )}
          <div className="flex flex-wrap gap-3 pt-2">
            {rerun.available && !isRerun && (
              <button onClick={onRerun} disabled={rerunning} className="btn btn-ghost-light btn-sm">
                {rerunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                {rerunning ? "Rerunning…" : "Rerun from source data"}
              </button>
            )}
            {isRerun && (
              <button onClick={onShowReference} className="btn btn-ghost-light btn-sm">
                Show notebook results
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
