import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react";
import { formatCell } from "../utils/format";

/**
 * Generic table. Pass only `rows` for an automatic table, or `columns` =
 * [{ key, label, format(value, row), align, sortable }] for formatted,
 * sortable columns. `isHighlighted(row)` and `onRowClick(row)` make rows
 * respond to the rest of the page (e.g. the selected date).
 */
export default function DataTable({
  rows,
  columns,
  pageSize = 10,
  emptyMessage = "No rows to display.",
  isHighlighted,
  onRowClick,
  caption,
}) {
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState(null); // { key, dir }

  const cols = useMemo(() => {
    if (columns) return columns;
    if (!rows || rows.length === 0) return [];
    return Object.keys(rows[0]).map((key) => ({ key, label: key }));
  }, [rows, columns]);

  const sorted = useMemo(() => {
    if (!rows) return [];
    if (!sort) return rows;
    return [...rows].sort((a, b) => {
      const va = a[sort.key];
      const vb = b[sort.key];
      if (va === vb) return 0;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      return (va > vb ? 1 : -1) * (sort.dir === "asc" ? 1 : -1);
    });
  }, [rows, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = sorted.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  if (!rows || rows.length === 0) {
    return <p className="py-6 text-sm text-muted">{emptyMessage}</p>;
  }

  function toggleSort(key) {
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: "desc" };
      if (s.dir === "desc") return { key, dir: "asc" };
      return null;
    });
  }

  return (
    <div className="border-t-2 border-navy">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[14.5px]">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-silver">
              {cols.map((col) => {
                const canSort = col.sortable !== false && !!columns;
                const active = sort?.key === col.key;
                const align = col.align === "right" ? "text-right" : "text-left";
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={`whitespace-nowrap px-3 py-3 font-mono text-[12px] font-normal text-faint first:pl-0 ${align}`}
                  >
                    {canSort ? (
                      <button
                        onClick={() => toggleSort(col.key)}
                        className={`inline-flex items-center gap-1 hover:text-navy ${active ? "text-navy" : ""}`}
                      >
                        {col.label}
                        {active &&
                          (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, i) => {
              const hl = isHighlighted?.(row);
              return (
                <tr
                  key={currentPage * pageSize + i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-silver/70 transition-colors ${
                    hl ? "bg-frost/80" : onRowClick ? "hover:bg-frost/40" : ""
                  } ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {cols.map((col, ci) => (
                    <td
                      key={col.key}
                      className={`tabular whitespace-nowrap px-3 py-3 first:pl-0 ${
                        col.align === "right" ? "text-right font-mono text-[13.5px]" : ""
                      } ${hl && ci === 0 ? "font-semibold text-coral-ink" : "text-ink"} ${
                        hl && ci === 0 ? "relative" : ""
                      }`}
                    >
                      {hl && ci === 0 && <span aria-hidden="true" className="absolute -left-3 inset-y-2 w-[3px] bg-coral" />}
                      {col.format ? col.format(row[col.key], row) : formatCell(row[col.key])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between py-3 font-mono text-[12px] text-muted">
          <span>
            Rows {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="p-1 hover:text-navy disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span>
              {currentPage + 1} / {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={currentPage === pageCount - 1}
              className="p-1 hover:text-navy disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
