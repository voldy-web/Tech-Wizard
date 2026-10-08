import { formatMoney, toPesewas } from './calc';

/** Format a server money value (number or string) as "GH₵ 126,664.00". */
export const money = (v, currency) => formatMoney(toPesewas(v), currency);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDate(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return { y, m, d };
}

/** "2025-05-19" -> "19 May 2025" */
export function fmtDate(iso) {
  const p = parseDate(iso);
  return p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : '—';
}

/** "2025-05-19" -> "19 May" */
export function fmtShort(iso) {
  const p = parseDate(iso);
  return p ? `${p.d} ${MONTHS[p.m - 1]}` : '—';
}

/** "2025-05-19","2025-05-25" -> "19 – 25 May 2025" (collapses shared month/year) */
export function fmtPeriod(from, to) {
  const a = parseDate(from), b = parseDate(to);
  if (!a || !b) return '—';
  if (a.y === b.y && a.m === b.m) return `${a.d} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
  if (a.y === b.y) return `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
  return `${fmtDate(from)} – ${fmtDate(to)}`;
}

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const pad = (n, w = 2) => String(n).padStart(w, '0');

/** Is a claim partly (not fully) paid? */
export const isPartiallyPaid = (c) => c.status !== 'PAID' && toPesewas(c.amountPaid) > 0;
