import { useEffect, useRef } from "react";
import PipelineStage from "./PipelineStage";

/**
 * Horizontal, sticky stage navigation. On narrow screens it scrolls sideways
 * and keeps the selected stage in view (horizontally only — the page itself
 * is never scrolled by this).
 */
export default function PipelineStepper({ stages, selectedIndex, visited = new Set(), onSelect }) {
  const listRef = useRef(null);
  const refs = useRef([]);
  const progress = ((selectedIndex + 1) / stages.length) * 100;

  useEffect(() => {
    const list = listRef.current;
    const item = refs.current[selectedIndex];
    if (!list || !item) return;
    const left = item.offsetLeft - list.offsetLeft;
    const right = left + item.offsetWidth;
    if (left < list.scrollLeft || right > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: Math.max(0, left - 16), behavior: "smooth" });
    }
  }, [selectedIndex]);

  return (
    <nav aria-label="Pipeline stages" className="relative">
      <ol ref={listRef} className="relative flex snap-x overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {stages.map((stage, i) => (
          <PipelineStage
            key={stage.name}
            stage={stage}
            index={i}
            isSelected={i === selectedIndex}
            isVisited={visited.has(i)}
            onSelect={onSelect}
            itemRef={(el) => (refs.current[i] = el)}
          />
        ))}
      </ol>
      <div className="h-[2px] bg-silver/70" aria-hidden="true">
        <div className="h-full bg-navy transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>
    </nav>
  );
}
