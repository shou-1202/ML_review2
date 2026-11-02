const ACCENT_CLASSES = {
  amber: "text-coral-ink",
  teal: "text-cyan-ink",
  ink: "text-navy",
};

/** One headline metric: large mono value under a top rule, label below. */
export default function MetricCard({ label, value, hint, accent = "amber" }) {
  return (
    <div className="border-t-2 border-navy pt-4">
      <p className={`tabular font-mono text-[34px] leading-none tracking-tight ${ACCENT_CLASSES[accent] || ACCENT_CLASSES.amber}`}>
        {value}
      </p>
      <p className="mt-2.5 text-[14px] font-semibold text-ink">{label}</p>
      {hint && <p className="mt-0.5 text-[13px] leading-snug text-muted">{hint}</p>}
    </div>
  );
}
