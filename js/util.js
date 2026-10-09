// Small helpers shared by the page and the service worker. No DOM in here.

export const pad = (n) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" in local time. */
export const dateKey = (d = new Date()) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "YYYY-MM-DD" -> Date at local midnight. */
export const parseKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

export const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

/** "HH:MM" -> minutes since midnight. */
export const mins = (t) => +t.slice(0, 2) * 60 + +t.slice(3, 5);

/** minutes since midnight -> "HH:MM" */
export const hhmm = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/** 95 -> "1 h 35 min" */
export const fmtDuration = (m) =>
  m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;

export const byTime = (a, b) => mins(a.time) - mins(b.time);

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** [1,2,3,4,5] -> "Mon to Fri" */
export function daysLabel(days) {
  const s = [...days].sort().join("");
  if (s === "0123456") return "Every day";
  if (s === "12345") return "Mon to Fri";
  if (s === "06") return "Sat and Sun";
  return [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((d) => DAY_SHORT[d]).join(", ");
}

/** Escape text before putting it into innerHTML (routine items are now typed in by you). */
export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
