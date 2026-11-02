import { useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Info, Plus } from "lucide-react";
import { assetUrl } from "../services/api";
import { classColor } from "../utils/classes";

/**
 * Building blocks for a stage's content, shared by the U3 and U4 pages so
 * every stage reads the same way: a large stage title, an open "What
 * happened?" block, wide editorial sections with the stage's real results,
 * and a closed "Why is this step performed?" block.
 */

export default function StageDetails({ index, total, stage, onPrev, onNext, nextName, prevName, children }) {
  return (
    <article>
      <header className="grid gap-6 border-b border-silver pb-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="font-mono text-[12.5px] text-coral-ink">
            Stage {String(index + 1).padStart(2, "0")} of {String(total).padStart(2, "0")}
          </p>
          <h2 className="display mt-3 text-display-md text-navy">{stage.name}</h2>
        </div>
        {stage.summary && (
          <div className="flex items-end lg:col-span-4 lg:justify-end">
            <p className="tabular max-w-xs border-l-2 border-cyan pl-4 font-mono text-[13px] leading-relaxed text-muted lg:text-right lg:border-l-0 lg:border-r-2 lg:pl-0 lg:pr-4">
              {stage.summary}
            </p>
          </div>
        )}
      </header>

      <div className="mt-12 space-y-14">{children}</div>

      <footer className="mt-20 grid gap-4 border-t border-silver pt-8 sm:grid-cols-2">
        <div>
          {index > 0 && (
            <button onClick={onPrev} className="group text-left">
              <span className="flex items-center gap-2 font-mono text-[12px] text-faint group-hover:text-navy">
                <ArrowLeft className="h-3.5 w-3.5" /> Previous stage
              </span>
              <span className="mt-1 block font-serif text-[24px] font-medium text-muted group-hover:text-navy">{prevName}</span>
            </button>
          )}
        </div>
        <div className="sm:text-right">
          {index < total - 1 && (
            <button onClick={onNext} className="group sm:ml-auto sm:text-right">
              <span className="flex items-center gap-2 font-mono text-[12px] text-coral-ink sm:justify-end">
                Next stage <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </span>
              <span className="mt-1 block font-serif text-[30px] font-medium leading-tight text-navy group-hover:text-coral-ink">
                {nextName}
              </span>
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}

/* ----------------------------------------------------------- layout ---- */

/** Wide editorial row: narrative column + visual column (12-col grid). */
export function Split({ narrative, children, reverse = false, wide = false }) {
  const n = wide ? "lg:col-span-3" : "lg:col-span-4";
  const v = wide ? "lg:col-span-9" : "lg:col-span-8";
  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
      <div className={`${n} ${reverse ? "lg:order-2" : ""}`}>{narrative}</div>
      <div className={`min-w-0 ${v} ${reverse ? "lg:order-1" : ""}`}>{children}</div>
    </div>
  );
}

/** A titled block inside a stage. */
export function Section({ title, hint, children, className = "" }) {
  return (
    <section className={className}>
      {(title || hint) && (
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          {title && <h3 className="font-serif text-[28px] font-medium leading-tight text-ink">{title}</h3>}
          {hint && <p className="font-mono text-[12px] text-faint">{hint}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Narrative heading + copy used in the left column of a Split. */
export function Narrative({ title, children }) {
  return (
    <div className="lg:sticky lg:top-44">
      {title && <h3 className="font-serif text-[30px] font-medium leading-[1.1] text-ink">{title}</h3>}
      <div className="prose-panel mt-4 space-y-3">{children}</div>
    </div>
  );
}

export function SectionLabel({ children, hint }) {
  return (
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
      <p className="font-serif text-[23px] font-medium leading-tight text-ink">{children}</p>
      {hint && <p className="font-mono text-[12px] text-faint">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------ disclosures ---- */

function Disclosure({ title, open = false, children, tone = "plain" }) {
  return (
    <details open={open} className="group border-t border-silver">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className={`font-serif text-[24px] font-medium leading-tight ${tone === "lead" ? "text-navy" : "text-ink"}`}>
          {title}
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-silver text-navy transition-all duration-300 group-open:rotate-45 group-open:border-navy group-open:bg-navy group-open:text-white group-hover:border-navy">
          <Plus className="h-4 w-4" strokeWidth={1.75} />
        </span>
      </summary>
      <div className="prose-panel max-w-[72ch] pb-7">{children}</div>
    </details>
  );
}

export function WhatHappened({ children, title = "What happened?" }) {
  return (
    <Disclosure title={title} open tone="lead">
      {children}
    </Disclosure>
  );
}

export function WhyPerformed({ children }) {
  return <Disclosure title="Why is this step performed?">{children}</Disclosure>;
}

export function MoreDetail({ title, children, open = false }) {
  return (
    <Disclosure title={title} open={open}>
      {children}
    </Disclosure>
  );
}

/* ------------------------------------------------------------ facts ---- */

const ACCENT_TEXT = { amber: "text-coral-ink", teal: "text-cyan-ink", danger: "text-danger" };

/** Editorial row of key figures (large mono values, hairline separators). */
export function StatGrid({ items, columns = 3 }) {
  const cols =
    columns === 4 ? "sm:grid-cols-4" : columns === 2 ? "sm:grid-cols-2" : items.length > 3 ? "sm:grid-cols-3 xl:grid-cols-6" : "sm:grid-cols-3";
  return (
    <dl className={`grid grid-cols-2 gap-x-6 gap-y-6 ${cols}`}>
      {items.map(([label, value, accent]) => (
        <div key={label} className="border-t-2 border-navy/80 pt-3">
          <dd className={`tabular font-mono text-[22px] leading-tight sm:text-[24px] ${ACCENT_TEXT[accent] || "text-navy"}`}>{value}</dd>
          <dt className="mt-1.5 text-[13px] leading-snug text-muted">{label}</dt>
        </div>
      ))}
    </dl>
  );
}

export function ChipList({ items, emptyLabel = "None" }) {
  if (!items || items.length === 0) return <p className="text-sm text-muted">{emptyLabel}</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-sm bg-frost px-2 py-0.5 font-mono text-xs text-navy">
          {item}
        </span>
      ))}
    </div>
  );
}

/** Callout for caveats the reader must not miss. `warn` is used for anomalies. */
export function Note({ tone = "info", title, children }) {
  const warn = tone === "warn";
  const Icon = warn ? AlertTriangle : Info;
  return (
    <aside
      className={`relative overflow-hidden px-6 py-5 text-[15px] leading-relaxed ${
        warn ? "border-l-[3px] border-coral bg-coral-soft/70" : "border-l-[3px] border-cyan bg-frost/60"
      }`}
    >
      {warn && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 right-0 hidden w-16 opacity-[0.18] sm:block"
          style={{ backgroundImage: "repeating-linear-gradient(135deg, #FF694F 0 6px, transparent 6px 14px)" }}
        />
      )}
      <div className={`relative flex gap-3 ${warn ? "sm:pr-16" : ""}`}>
        <Icon className={`mt-1 h-[18px] w-[18px] shrink-0 ${warn ? "text-coral-ink" : "text-cyan-ink"}`} strokeWidth={1.75} />
        <div className="text-muted">
          {title && <p className={`mb-1 font-serif text-[21px] font-semibold leading-snug ${warn ? "text-coral-ink" : "text-navy"}`}>{title}</p>}
          {children}
        </div>
      </div>
    </aside>
  );
}

export function Formula({ children, caption }) {
  return (
    <div className="border-y border-silver bg-surface px-6 py-5">
      <p className="font-serif text-[26px] italic leading-tight text-navy">{children}</p>
      {caption && <p className="mt-2 text-[13px] text-muted">{caption}</p>}
    </div>
  );
}

export function Code({ children }) {
  return <code className="rounded-sm bg-frost px-1 py-px font-mono text-[0.85em] text-navy">{children}</code>;
}

/** An actual figure from the executed notebook, collapsed by default. */
export function NotebookFigure({ figure, title = "Original notebook figure", open = false }) {
  const [failed, setFailed] = useState(false);
  if (!figure) return null;
  return (
    <details open={open} className="group border-t border-silver">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-[12.5px] text-muted group-open:text-navy group-hover:text-navy">{title}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-silver text-navy transition-transform duration-300 group-open:rotate-45">
          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
        </span>
      </summary>
      <figure className="pb-6">
        {failed ? (
          <p className="py-6 text-sm text-muted">The figure could not be loaded from the backend.</p>
        ) : (
          <div className="bg-white p-3 shadow-panel sm:p-5">
            <img
              src={assetUrl(figure.url)}
              alt={figure.caption}
              loading="lazy"
              onError={() => setFailed(true)}
              className="mx-auto h-auto w-full"
            />
          </div>
        )}
        <figcaption className="mt-3 text-[13px] text-muted">
          {figure.caption} <span className="font-mono text-[11.5px] text-faint">— {figure.source}</span>
        </figcaption>
      </figure>
    </details>
  );
}

/* ---------------------------------------------------------- classes ---- */

export function ClassSwatch({ name, kind = "ui", className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: classColor(name, kind) }}
    />
  );
}

export function ClassName({ name, kind = "ui" }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <ClassSwatch name={name} kind={kind} />
      {name}
    </span>
  );
}

/* --------------------------------------------------------- controls ---- */

/** Segmented control for selecting dates, intervals, clusters or views. */
export function ChoiceGroup({ options, value, onChange, label, size = "md" }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            title={opt.title}
            className={`rounded-sm border font-mono transition-colors ${
              size === "sm" ? "px-2.5 py-1.5 text-[12px]" : "px-3.5 py-2 text-[12.5px]"
            } ${
              active
                ? "border-navy bg-navy text-white"
                : "border-silver bg-surface text-muted hover:border-navy hover:text-navy"
            }`}
          >
            {opt.label}
            {opt.flag && <span className={`ml-1.5 ${active ? "text-coral" : "text-coral-ink"}`}>{opt.flag}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Light readout panel used beside interactive visuals (selected cell, cluster…). */
export function Readout({ children, className = "" }) {
  return (
    <div className={`border-l-2 border-navy bg-surface px-5 py-4 text-[15px] shadow-panel ${className}`} aria-live="polite">
      {children}
    </div>
  );
}
