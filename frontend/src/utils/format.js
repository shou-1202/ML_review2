/**
 * Display helpers. None of them invent a value — null/undefined/NaN always
 * render as a plain dash.
 */
const isMissing = (v) => v === null || v === undefined || Number.isNaN(v);

export function formatCell(value) {
  if (isMissing(value)) return "—";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return value.toLocaleString("en-US");
    return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function formatInt(value) {
  if (isMissing(value)) return "—";
  return Math.round(Number(value)).toLocaleString("en-US");
}

/** Fixed decimals with thousands separators: formatNum(1234.5, 1) -> "1,234.5" */
export function formatNum(value, digits = 2) {
  if (isMissing(value)) return "—";
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** A value that is already a percentage (76.34 -> "76.34%"). */
export function formatPct(value, digits = 1) {
  if (isMissing(value)) return "—";
  return `${Number(value).toFixed(digits)}%`;
}

/** Signed number, using a real minus sign: -0.024 -> "−0.024" */
export function formatSigned(value, digits = 3) {
  if (isMissing(value)) return "—";
  const s = Math.abs(Number(value)).toFixed(digits);
  if (Number(s) === 0) return s;
  return value < 0 ? `−${s}` : `+${s}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2025-11-14" -> "14 Nov 2025" (or "14 Nov" with year=false) */
export function formatDate(iso, { year = true } = {}) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso ?? "—";
  const [y, m, d] = iso.split("-").map(Number);
  return year ? `${d} ${MONTHS[m - 1]} ${y}` : `${d} ${MONTHS[m - 1]}`;
}
