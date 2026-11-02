import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import LoadingState from "./LoadingState";
import PipelineStepper from "./PipelineStepper";
import SourceBar from "./SourceBar";
import StageDetails from "./StageDetails";

const NAV_H = 64; // fixed navbar height

/**
 * Shared shell for an experiment page: a full-width hero (supplied by the
 * page), a sticky horizontal stage navigation, the selected stage's content
 * in a wide editorial layout, and a data-provenance band.
 *
 * The selected stage lives in the URL (?step=3) so a stage can be linked to.
 * The hero receives `api.selectStage(i)` so it can drive the stages (U4's
 * date timeline does).
 */
export default function LabPage({
  endpoint,
  fetchResults,
  rerunResults,
  loadingMessage,
  rerunMessage,
  buildStages,
  renderHero,
}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState(false);
  const [rerunError, setRerunError] = useState(null);
  const [visited, setVisited] = useState(() => new Set());
  const [params, setParams] = useSearchParams();
  const stagesRef = useRef(null);
  const reduce = useReducedMotion();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    setRerunError(null);
    fetchResults()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [fetchResults]);

  useEffect(() => {
    load();
  }, [load]);

  function rerun() {
    setRerunning(true);
    setRerunError(null);
    rerunResults()
      .then(setData)
      .catch((err) => setRerunError(err.message))
      .finally(() => setRerunning(false));
  }

  const stages = data ? buildStages(data) : [];
  const requested = Number(params.get("step"));
  const selectedIndex =
    Number.isInteger(requested) && requested >= 1 && requested <= stages.length ? requested - 1 : 0;

  function scrollToStages(force) {
    const el = stagesRef.current;
    if (!el) return;
    const target = el.getBoundingClientRect().top + window.scrollY - NAV_H;
    if (force || window.scrollY > target + 4) {
      window.scrollTo({ top: target, behavior: reduce ? "auto" : "smooth" });
    }
  }

  function selectStage(i, { scroll = "auto" } = {}) {
    if (i < 0 || i >= stages.length) return;
    setVisited((prev) => new Set(prev).add(selectedIndex));
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("step", String(i + 1));
        return next;
      },
      { replace: true }
    );
    requestAnimationFrame(() => scrollToStages(scroll === "always"));
  }

  const api = { selectStage, stagesReady: !!data };
  const stage = stages[selectedIndex];

  return (
    <>
      {renderHero(data, api)}

      <div ref={stagesRef} className="scroll-mt-16">
        {loading && (
          <div className="page-x py-16">
            <LoadingState variant="loading" message={loadingMessage} />
          </div>
        )}

        {!loading && error && (
          <div className="page-x py-16">
            <LoadingState variant="error" message={error} onRetry={load} />
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="sticky top-16 z-30 border-b border-silver bg-snow/95 backdrop-blur-md">
              <div className="page-x !px-0 sm:!px-8 lg:!px-12">
                <PipelineStepper
                  stages={stages}
                  selectedIndex={selectedIndex}
                  visited={visited}
                  onSelect={(i) => selectStage(i)}
                />
              </div>
            </div>

            {rerunning && (
              <div className="page-x pt-10">
                <LoadingState variant="loading" message={rerunMessage} />
              </div>
            )}

            <div className="page-x py-14 sm:py-20">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={selectedIndex}
                  initial={reduce ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <StageDetails
                    index={selectedIndex}
                    total={stages.length}
                    stage={stage}
                    onPrev={() => selectStage(selectedIndex - 1, { scroll: "always" })}
                    onNext={() => selectStage(selectedIndex + 1, { scroll: "always" })}
                    nextName={stages[selectedIndex + 1]?.name}
                    prevName={stages[selectedIndex - 1]?.name}
                  >
                    {stage.render()}
                  </StageDetails>
                </motion.div>
              </AnimatePresence>
            </div>

            <SourceBar
              endpoint={endpoint}
              source={data.source}
              onRerun={rerun}
              rerunning={rerunning}
              rerunError={rerunError}
              onShowReference={load}
            />
          </>
        )}
      </div>
    </>
  );
}
