import { useState } from "react";
import LineChart from "../charts/LineChart";
import DataTable from "../DataTable";
import { ChoiceGroup, ClassSwatch, Narrative, NotebookFigure, Section, Split, WhatHappened, WhyPerformed } from "../StageDetails";
import { classColor } from "../../utils/classes";
import { formatDate, formatNum, formatSigned } from "../../utils/format";

/** Preset views: hiding the large classes rescales the axis so the lake becomes readable. */
export const AREA_VIEWS = [
  { value: "all", label: "All classes" },
  { value: "Glacier", label: "Glacier" },
  { value: "Glacial Lake", label: "Glacial Lake" },
  { value: "Non-Glacier Land", label: "Non-Glacier Land" },
];

function Highlight({ name, value, note, tone }) {
  return (
    <div className="border-t-2 pt-4" style={{ borderColor: classColor(name) }}>
      <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
        <ClassSwatch name={name} /> {name}
      </p>
      <p className="tabular mt-2 font-mono text-[26px] leading-tight text-navy">{value}</p>
      <p className={`mt-1 font-mono text-[12.5px] ${tone === "warn" ? "text-coral-ink" : tone === "up" ? "text-cyan-ink" : "text-muted"}`}>{note}</p>
    </div>
  );
}

export default function AreaStep({ data }) {
  const names = data.classes.map((c) => c.name);
  const series = data.areas.series;
  const h = data.areas.highlights;
  const anomaly = data.forecast.anomaly;
  const [view, setView] = useState("all");
  const hidden = view === "all" ? [] : names.filter((n) => n !== view);
  const total = data.grid.study_area_km2;

  const chartData = series.map((r) => ({
    ...r,
    note: r.date === anomaly.date ? "Lake classification anomaly" : undefined,
    noteTone: "warn",
  }));
  const gDelta = h.glacier[1] - h.glacier[0];
  const lDelta = h.land[1] - h.land[0];

  return (
    <>
      <div className="grid gap-8 sm:grid-cols-3">
        <Highlight
          name="Glacier"
          value={`${formatNum(h.glacier[0], 2)} → ${formatNum(h.glacier[1], 2)} km²`}
          note={`${formatSigned(gDelta, 2)} km² (${formatSigned((100 * gDelta) / h.glacier[0], 0)}%)`}
          tone="warn"
        />
        <Highlight
          name="Glacial Lake"
          value={`${formatNum(h.lake_range_excl_anomaly[0], 2)}–${formatNum(h.lake_range_excl_anomaly[1], 2)} km²`}
          note={`except ${formatDate(anomaly.date, { year: false })} (${formatNum(anomaly.lake_area_km2, 2)} km²)`}
        />
        <Highlight
          name="Non-Glacier Land"
          value={`${formatNum(h.land[0], 2)} → ${formatNum(h.land[1], 2)} km²`}
          note={`${formatSigned(lDelta, 2)} km²`}
          tone="up"
        />
      </div>

      <WhatHappened>
        <p>
          For every date the notebook summed the exact area of the valid pixels in each class. Because the same{" "}
          {formatNum(total, 2)} km² of pixels is counted on every date, the three areas always add up to the study area: whatever
          one class loses, the others gain.
        </p>
      </WhatHappened>

      <Section title="Class area through time">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px] text-muted">km² on each observation date — hover to read values</p>
          <ChoiceGroup label="Chart view" size="sm" value={view} onChange={setView} options={AREA_VIEWS} />
        </div>
        <LineChart
          key={view}
          data={chartData}
          series={names.map((n) => ({ key: n, label: n, color: classColor(n) }))}
          initiallyHidden={hidden}
          height={400}
          zeroBased={view === "all"}
          yTitle="Area (km²)"
          yFormat={(v) => (view === "Glacial Lake" ? v.toFixed(2) : v.toFixed(0))}
          tooltipFormat={(v) => `${formatNum(v, 3)} km²`}
          endLabels
          ariaLabel="Class area in square kilometres for each observation date"
        />
        {view === "all" && (
          <p className="mt-3 font-mono text-[12.5px] text-faint">
            At this scale the lake looks flat — choose “Glacial Lake” to see the {formatDate(anomaly.date, { year: false })} dip.
          </p>
        )}
      </Section>

      <Split
        narrative={
          <Narrative title="Reading the series">
            <p>
              <strong>Glacier</strong> lost {formatNum(-gDelta, 2)} km² in {(series.length - 1) * data.settings.step_days} days — a
              fast first step, then a steady decline. <strong>Non-Glacier Land</strong> is its mirror image, rising by{" "}
              {formatNum(lDelta, 2)} km².
            </p>
            <p>
              <strong>Glacial Lake</strong> holds at {formatNum(h.lake_range_excl_anomaly[0], 2)}–{formatNum(h.lake_range_excl_anomaly[1], 2)}{" "}
              km² except on {formatDate(anomaly.date)}, when it drops to {formatNum(anomaly.lake_area_km2, 2)} km² and recovers on the
              next date — a classification event, not a real change in the lake.
            </p>
          </Narrative>
        }
      >
        <DataTable
          rows={series.map((r) => ({ ...r, total: names.reduce((a, n) => a + r[n], 0) }))}
          pageSize={9}
          isHighlighted={(r) => r.date === anomaly.date}
          columns={[
            { key: "date", label: "Date", format: (v) => formatDate(v) },
            ...names.map((n) => ({ key: n, label: n, align: "right", format: (v) => formatNum(v, 3) })),
            { key: "total", label: "Total", align: "right", format: (v) => <span className="text-muted">{formatNum(v, 3)}</span> },
          ]}
        />
      </Split>

      <div>
        <NotebookFigure figure={data.figures.class_area} />
        <WhyPerformed>
          Class areas are the quantity the Markov chain predicts, so they are the baseline every later stage is compared
          with. Plotting them first shows the overall trend — and the one date that does not fit it.
        </WhyPerformed>
      </div>
    </>
  );
}
