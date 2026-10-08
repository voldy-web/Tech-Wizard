// Live claim calculations in INTEGER pesewas (1 GH₵ = 100 pesewas) so totals never drift.
// The backend (ClaimCalculator.java) is the source of truth and recalculates on save;
// this file mirrors its rules exactly so the editor can update instantly while typing.
//
//   measured amount = qty x rate          lump-sum amount = entered
//   subTotal = sum(amounts)               levy = subTotal x levy% / 100
//   total = subTotal + levy               grandTotal = total + balanceBroughtForward

/** Parse a decimal (string or number) into an integer scaled by 10^scale, rounding HALF_UP. Invalid -> 0. */
function parseScaled(value, scale) {
  if (value === null || value === undefined || value === '') return 0;
  let s = typeof value === 'number' ? String(value) : String(value).replace(/[,\s]/g, '');
  if (/e/i.test(s)) s = Number(s).toFixed(scale + 2); // exponent form from tiny/huge numbers
  const m = /^([+-])?(\d*)(?:\.(\d*))?$/.exec(s);
  if (!m || (m[2] === '' && (m[3] === undefined || m[3] === ''))) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  const intPart = m[2] || '0';
  const frac = m[3] || '';
  const kept = (frac + '0'.repeat(scale)).slice(0, scale);
  let n = parseInt(intPart + kept, 10);
  if (frac.length > scale && frac.charCodeAt(scale) - 48 >= 5) n += 1; // HALF_UP on the next digit
  return sign * n;
}

export const toPesewas = (v) => parseScaled(v, 2);
export const toQtyMilli = (v) => parseScaled(v, 3);
export const toPercentHundredths = (v) => parseScaled(v, 2);

/** Integer division rounding half away from zero (matches BigDecimal HALF_UP). */
function divRound(numerator, denominator) {
  const sign = numerator < 0 ? -1 : 1;
  const n = Math.abs(numerator);
  return sign * Math.floor((2 * n + denominator) / (2 * denominator));
}

export const isLumpSum = (item) => item.type === 'LUMP_SUM';

/** Calculated amount for a MEASURED row in pesewas: qty x rate. */
export function measuredAmount(item) {
  return divRound(toQtyMilli(item.qty) * toPesewas(item.rate), 1000);
}

/** Row amount in pesewas: lump sum = entered amount, measured = qty x rate (never typed by hand). */
export function rowAmount(item) {
  return isLumpSum(item) ? toPesewas(item.amount) : measuredAmount(item);
}

/**
 * True when a MEASURED row carries an entered amount that differs from qty x rate.
 * (An empty/undefined enteredAmount is not a mismatch.)
 */
export function hasMismatch(item) {
  if (isLumpSum(item)) return false;
  const entered = item.enteredAmount;
  if (entered === null || entered === undefined || entered === '') return false;
  return toPesewas(entered) !== measuredAmount(item);
}

export function subTotal(items) {
  return items.reduce((sum, it) => sum + rowAmount(it), 0);
}

export function levyAmount(subTotalPesewas, levyPercent) {
  return divRound(subTotalPesewas * toPercentHundredths(levyPercent), 10000);
}

/** All totals in pesewas. */
export function computeTotals(items, levyPercent, balanceBroughtForward) {
  const sub = subTotal(items || []);
  const levy = levyAmount(sub, levyPercent);
  const total = sub + levy;
  const grandTotal = total + toPesewas(balanceBroughtForward);
  return { subTotal: sub, levy, total, grandTotal };
}

/** Both arguments in pesewas. */
export const outstanding = (grandTotalPesewas, amountPaidPesewas) => grandTotalPesewas - amountPaidPesewas;

/** Pesewas -> "126,664.00" */
export function formatAmount(pesewas) {
  const neg = pesewas < 0;
  const abs = Math.abs(Math.round(pesewas));
  const whole = Math.floor(abs / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const frac = String(abs % 100).padStart(2, '0');
  return `${neg ? '-' : ''}${whole}.${frac}`;
}

/** Pesewas -> "GH₵ 126,664.00" */
export function formatMoney(pesewas, currency = 'GH₵') {
  const s = formatAmount(pesewas);
  return s.startsWith('-') ? `-${currency} ${s.slice(1)}` : `${currency} ${s}`;
}

/** Pesewas -> plain decimal string for inputs/API ("7780.50"). */
export function toDecimalString(pesewas) {
  const neg = pesewas < 0;
  const abs = Math.abs(pesewas);
  return `${neg ? '-' : ''}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function below1000(n) {
  const parts = [];
  if (n >= 100) { parts.push(`${ONES[Math.floor(n / 100)]} Hundred`); n %= 100; if (n) parts.push('and'); }
  if (n >= 20) { parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '')); }
  else if (n > 0) parts.push(ONES[n]);
  return parts.join(' ');
}

/** 5696200 pesewas -> "Fifty-Six Thousand Nine Hundred and Sixty-Two Ghana Cedis Only" */
export function amountInWords(pesewas) {
  const abs = Math.abs(Math.round(pesewas));
  let cedis = Math.floor(abs / 100);
  const pes = abs % 100;
  const scales = [[1e9, 'Billion'], [1e6, 'Million'], [1e3, 'Thousand']];
  const parts = [];
  for (const [size, name] of scales) {
    if (cedis >= size) { parts.push(`${below1000(Math.floor(cedis / size))} ${name}`); cedis %= size; }
  }
  if (cedis > 0 || parts.length === 0) {
    const tail = below1000(cedis) || 'Zero';
    parts.push(parts.length && cedis < 100 && cedis > 0 ? `and ${tail}` : tail);
  }
  let words = `${parts.join(' ')} Ghana Cedis`;
  if (pes) words += ` and ${below1000(pes)} Pesewas`;
  return `${words} Only`;
}
