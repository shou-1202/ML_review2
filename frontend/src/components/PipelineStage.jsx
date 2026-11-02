import { Check } from "lucide-react";

/**
 * One stop in the horizontal stage navigation: number, short uppercase name
 * and (on wide screens) the stage's one-line result read from the API.
 */
export default function PipelineStage({ stage, index, isSelected, isVisited, onSelect, itemRef }) {
  return (
    <li className="min-w-[150px] flex-1 snap-start" ref={itemRef}>
      <button
        onClick={() => onSelect(index)}
        aria-current={isSelected ? "step" : undefined}
        className={`group relative flex h-full w-full flex-col gap-1 px-4 pb-4 pt-5 text-left transition-colors duration-200 ${
          isSelected ? "bg-navy text-white" : "bg-transparent text-ink hover:bg-frost/70"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute inset-x-0 top-0 h-[3px] transition-colors ${isSelected ? "bg-coral" : "bg-transparent group-hover:bg-silver"}`}
        />
        <span className="flex items-center gap-2">
          <span className={`font-mono text-[13px] ${isSelected ? "text-coral" : "text-faint group-hover:text-navy"}`}>
            {String(index + 1).padStart(2, "0")}
          </span>
          {isVisited && !isSelected && <Check className="h-3 w-3 text-cyan-ink" strokeWidth={2.5} aria-label="visited" />}
        </span>
        <span className="text-[12px] font-bold uppercase leading-snug tracking-[0.14em]">{stage.nav || stage.name}</span>
        {stage.summary && (
          <span
            className={`tabular hidden font-mono text-[11px] leading-snug xl:block ${isSelected ? "text-white/65" : "text-faint"}`}
          >
            {stage.summary}
          </span>
        )}
      </button>
    </li>
  );
}
