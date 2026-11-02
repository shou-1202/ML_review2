import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { assetUrl } from "../services/api";

/**
 * Large date-by-date viewer for classified map images taken from the notebook,
 * set on a midnight panel so the classification colours carry the page.
 *
 *  items    [{ key, label, imageUrl, flag? }]
 *  legend   [{ color, label }]   - colours as drawn in the map images
 *  aside    node shown beside the map (e.g. that date's metrics)
 */
export default function MapGallery({ items, selectedKey, onSelect, legend, caption, aside, alt }) {
  const [failed, setFailed] = useState({});
  const index = Math.max(0, items.findIndex((it) => it.key === selectedKey));
  const item = items[index];

  const go = (delta) => onSelect(items[(index + delta + items.length) % items.length].key);

  return (
    <div className="bg-midnight text-white shadow-lift">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-8">
        <div role="group" aria-label="Observation date" className="flex flex-wrap gap-1">
          {items.map((it) => {
            const active = it.key === item?.key;
            return (
              <button
                key={it.key}
                onClick={() => onSelect(it.key)}
                aria-pressed={active}
                className={`rounded-sm px-2.5 py-1.5 font-mono text-[12px] transition-colors ${
                  active ? "bg-white text-midnight" : "text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                {it.label}
                {it.flag && <span className={`ml-1 ${active ? "text-coral-ink" : "text-coral"}`}>{it.flag}</span>}
              </button>
            );
          })}
        </div>
        <span className="font-mono text-[12px] text-white/45">
          {index + 1} / {items.length}
        </span>
      </div>

      <div className="grid gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <figure
          className="relative"
          tabIndex={0}
          aria-label={`${alt} — ${item?.label}. Use the left and right arrow keys to change date.`}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
          }}
        >
          <div className="relative mx-auto max-w-[620px]">
            {item?.imageUrl && !failed[item.key] ? (
              <img
                key={item.key}
                src={assetUrl(item.imageUrl)}
                alt={`${alt} — ${item.label}`}
                onError={() => setFailed((f) => ({ ...f, [item.key]: true }))}
                className="block h-auto w-full"
              />
            ) : (
              <div className="flex aspect-[490/591] flex-col items-center justify-center gap-2 border border-dashed border-white/20 text-center text-sm text-white/60">
                <ImageOff className="h-5 w-5" strokeWidth={1.5} />
                Map image not available for this date.
              </div>
            )}
            <button
              onClick={() => go(-1)}
              aria-label="Previous date"
              className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-2.5 text-midnight shadow-lift transition-colors hover:bg-coral"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="Next date"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rounded-full bg-white p-2.5 text-midnight shadow-lift transition-colors hover:bg-coral"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <figcaption className="mx-auto mt-5 max-w-[620px] space-y-2">
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {legend.map((l) => (
                <span key={l.label} className="flex items-center gap-2 text-[13px] text-white/80">
                  <span className="inline-block h-3 w-3 border border-white/25" style={{ backgroundColor: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
            {caption && <p className="font-mono text-[11.5px] text-white/45">{caption}</p>}
          </figcaption>
        </figure>

        {aside && <div className="min-w-0">{aside}</div>}
      </div>
    </div>
  );
}
