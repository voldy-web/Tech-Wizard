import { formatAmount, roundUpTotal, toPesewas } from './calc';
import { pad } from './format';

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const nl2br = (v) => esc(v).replace(/\r?\n/g, '<br/>');

/** Only allow image data URIs / http(s) URLs in <img src>. */
const safeSrc = (u) => (u && /^(data:image\/[a-z+.-]+;base64,|https?:\/\/)/i.test(u) ? esc(u) : '');

/** 450 -> "450", 1.2 -> "1.2", 24.000 -> "24" */
const qtyText = (q) => {
  const n = Number(q);
  if (Number.isNaN(n)) return '';
  return String(parseFloat(n.toFixed(3)));
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function parts(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return { y, m, d };
}

/** "2006-03-19" -> "19 March 2006" */
function longDate(iso) {
  const p = parts(iso);
  return p ? `${p.d} ${MONTHS[p.m - 1]} ${p.y}` : '';
}

/** "2006-03-09","2006-03-17" -> "09 – 17 March 2006" */
function duration(from, to) {
  const a = parts(from); const b = parts(to);
  if (!a || !b) return '';
  const dd = (n) => String(n).padStart(2, '0');
  if (a.y === b.y && a.m === b.m) return `${dd(a.d)} – ${dd(b.d)} ${MONTHS[b.m - 1]} ${b.y}`;
  if (a.y === b.y) return `${dd(a.d)} ${MONTHS[a.m - 1]} – ${dd(b.d)} ${MONTHS[b.m - 1]} ${b.y}`;
  return `${longDate(from)} – ${longDate(to)}`;
}

const initials = (name) => (name || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

/**
 * Formal A4 "CERTIFICATE OF CLAIM": navy letterhead band · project/client/scope/contract-sum/duration card ·
 * weekly itemised schedule · Sub-Total / Markup / Total / Balance B/F / Grand Total / Rounded Total ·
 * Prepared & Approved cards · numbered notes.
 *
 * The same string is shown in the preview and handed to expo-print to make the PDF.
 * All figures come from the server (source of truth).
 */
export function buildCertificateHtml(claim, settings = {}) {
  const cur = settings.currency || 'GH₵';
  const m = (v) => formatAmount(toPesewas(v));
  const logo = safeSrc(settings.logoUrl);
  const sig = safeSrc(settings.signatureUrl);
  const items = claim.items || [];
  const levyPct = parseFloat(Number(claim.levyPercent ?? 0).toFixed(2));
  const preparer = claim.preparedBy || settings.preparerName || '';
  const approved = claim.status === 'APPROVED' || claim.status === 'PAID';
  const scope = (claim.scopeOfWork || '').trim();
  const subtitle = scope && scope.length <= 80 && !scope.includes('\n') ? scope : '';
  const hasContract = claim.contractSum !== null && claim.contractSum !== undefined && claim.contractSum !== '' && toPesewas(claim.contractSum) > 0;
  const rounded = formatAmount(roundUpTotal(toPesewas(claim.grandTotal)));

  const rows = items.map((it, i) => {
    const lump = it.type === 'LUMP_SUM';
    const qty = lump ? esc(it.qtyText ?? '1 Item') : `${esc(qtyText(it.qty))}${it.unit ? ` ${esc(it.unit)}` : ''}`;
    return `<tr>
      <td class="c n">${i + 1}</td>
      <td>${esc(it.description) || '&nbsp;'}</td>
      <td class="c">${qty}</td>
      <td class="r${lump ? ' wrap' : ''}">${lump ? esc(it.priceText ?? '') : m(it.rate)}</td>
      <td class="r b">${m(it.amount)}</td>
      <td class="rem">${esc(it.remarks)}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" class="c empty">No items</td></tr>';

  const notes = [
    `All amounts are expressed in Ghana Cedis (${esc(cur)}).`,
    `A ${levyPct}% markup has been added to the sub-total.`,
    'Balance Brought Forward (B/F) reflects outstanding amounts carried over from the previous claim period.',
    'The Rounded Total is the Grand Total rounded up to a round figure.',
  ];
  const custom = (claim.notes || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const noteItems = [...notes, ...custom.map(esc)];

  const cell = (label, value) => `<div class="cell"><div class="k">${label}</div><div class="v">${value}</div></div>`;
  const info = [
    cell('Project', esc(claim.projectName)),
    cell('Client', esc(claim.client) || '—'),
    cell('Scope of work', nl2br(scope) || '—'),
    cell('Duration', esc(duration(claim.periodFrom, claim.periodTo)) || '—'),
    hasContract ? cell('Contract sum', `${esc(cur)} ${m(claim.contractSum)}`) : '',
    claim.location ? cell('Location', esc(claim.location)) : '',
  ].join('');

  const contact = [settings.address, settings.phone, settings.email, settings.tin && `TIN: ${settings.tin}`].filter(Boolean).map(esc).join(' • ');
  const footer = `Certificate of Claim — ${esc(claim.projectName)} | Week ${claim.weekNumber} | ${esc(claim.reference)}`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=794, minimum-scale=0.1, maximum-scale=5, user-scalable=yes"/>
<title>Certificate of Claim ${esc(claim.reference)}</title>
<style>
  @page { size: A4; margin: 14mm 12mm 14mm 12mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { font-family: Arial, Helvetica, sans-serif; color: #15183a; font-size: 12.5px; line-height: 1.4; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 100%; max-width: 794px; margin: 0 auto; padding: 0 0 34px; }
  .hero { background: #0f1236; color: #fff; padding: 26px 40px 24px; border-bottom: 5px solid #f4b942; }
  .brand { display: flex; align-items: center; gap: 14px; }
  .logo { width: 52px; height: 52px; border-radius: 26px; background: #1c2150; color: #6fe7e0; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 18px; overflow: hidden; flex: none; border: 2px solid #5b3cc4; }
  .logo img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
  .co { font-weight: 700; font-size: 16px; } .addr { color: #b8bce0; font-size: 11px; margin-top: 2px; }
  .title { margin: 22px 0 0; font-size: 31px; letter-spacing: 2px; font-weight: 800; }
  .sub { color: #6fe7e0; margin-top: 6px; font-size: 14px; font-style: italic; }
  .pill { display: inline-block; margin-top: 14px; background: #5b3cc4; color: #fff; border-radius: 20px; padding: 5px 16px; font-weight: 700; font-size: 12px; letter-spacing: .6px; }
  .body { padding: 0 40px; }
  .info { display: flex; flex-wrap: wrap; gap: 0; margin: 24px 0 22px; background: #f5f4fc; border: 1px solid #e0dff4; border-radius: 14px; overflow: hidden; }
  .cell { width: 50%; padding: 11px 16px; border-bottom: 1px solid #e0dff4; }
  .cell:nth-child(odd) { border-right: 1px solid #e0dff4; }
  .k { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #5b3cc4; font-weight: 700; }
  .v { margin-top: 3px; font-weight: 600; font-size: 13px; }
  table { border-collapse: collapse; width: 100%; }
  .wk { margin: 0 0 8px; font-weight: 800; color: #0f1236; font-size: 13px; letter-spacing: .8px; }
  .wk span { color: #5b3cc4; }
  .grid { border: 1px solid #e0dff4; border-radius: 12px; overflow: hidden; }
  .grid th { background: #0f1236; color: #fff; padding: 10px 8px; overflow: hidden; font-size: 12px; font-weight: 700; }
  .grid td { padding: 9px 8px; border-top: 1px solid #ecebf8; vertical-align: top; }
  .grid tbody tr:nth-child(even) td { background: #f8f7fe; }
  .grid tbody tr { page-break-inside: avoid; }
  td.wrap { white-space: normal; word-break: break-word; }
  td.c, th.c { text-align: center; } td.r { text-align: right; white-space: nowrap; } td.b { font-weight: 700; } td.n { color: #5b3cc4; font-weight: 700; }
  td.rem { font-size: 11px; color: #555a78; } td.empty { color: #777; padding: 16px; }
  table.grid { table-layout: fixed; }
  .tot { margin-top: 12px; page-break-inside: avoid; }
  .tot td { padding: 10px 8px; border-top: 1px solid #ecebf8; }
  .tot .lab { font-weight: 700; padding-left: 14px; } .tot .val { text-align: right; font-weight: 700; white-space: nowrap; }
  .tot .r-sub td { background: #f5f4fc; }
  .tot .r-levy td { background: #fff; } .tot .r-levy .val { color: #b3261e; }
  .tot .r-total td { background: #e0dff4; }
  .tot .r-bf td { background: #fff; }
  .tot .r-grand td { background: #5b3cc4; color: #fff; font-size: 13.5px; }
  .tot .r-round td { background: #f4b942; color: #3a2700; font-size: 14.5px; font-weight: 800; }
  .sigs { display: flex; gap: 22px; margin-top: 30px; page-break-inside: avoid; }
  .sig { flex: 1; background: #f5f4fc; border: 1px solid #e0dff4; border-radius: 14px; padding: 14px 16px; min-height: 120px; }
  .sig .t { font-weight: 800; color: #0f1236; font-size: 13px; }
  .sig .ln { border-bottom: 1px solid #15183a; margin-top: 22px; min-height: 22px; font-weight: 700; padding-bottom: 2px; }
  .sig img { max-height: 44px; max-width: 60%; display: block; margin-top: 8px; }
  .sig .meta { font-size: 12px; margin-top: 6px; color: #333; }
  .notes { margin-top: 24px; border-left: 4px solid #6fe7e0; padding-left: 14px; page-break-inside: avoid; }
  .notes b { color: #0f1236; font-size: 13px; } .notes ol { margin: 6px 0 0 0; padding-left: 20px; font-size: 11.5px; color: #333; } .notes li { margin: 3px 0; }
  .foot { margin: 26px 40px 0; border-top: 2px solid #f4b942; padding-top: 8px; text-align: center; color: #7b7f9f; font-size: 10.5px; }
</style></head>
<body><div class="page">
  <div class="hero">
    ${settings.companyName || logo ? `<div class="brand">
      <div class="logo">${logo ? `<img src="${logo}"/>` : esc(initials(settings.companyName))}</div>
      <div><div class="co">${esc(settings.companyName)}</div><div class="addr">${contact}</div></div>
    </div>` : ''}
    <h1 class="title">CERTIFICATE OF CLAIM</h1>
    ${subtitle ? `<div class="sub">${esc(subtitle)}</div>` : ''}
    <div class="pill">WEEK ${claim.weekNumber} &nbsp;·&nbsp; ${esc(claim.reference)}</div>
  </div>

  <div class="body">
    <div class="info">${info}</div>

    <div class="wk">WEEK ${claim.weekNumber} — ITEMISED SCHEDULE OF WORKS</div>
    <table class="grid">
      <thead>
        <tr><th class="c" style="width:8%">Item</th><th style="text-align:left">Description</th><th class="c" style="width:14%">Qty</th><th style="width:15%">Unit Price<br/>(${esc(cur)})</th><th style="width:15%">Amount<br/>(${esc(cur)})</th><th style="width:12%">Remarks</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <table class="grid tot">
      <colgroup><col style="width:8%"/><col/><col style="width:14%"/><col style="width:15%"/><col style="width:15%"/><col style="width:12%"/></colgroup>
      <tr class="r-sub"><td colspan="4" class="lab">Sub-Total</td><td class="val">${m(claim.subTotal)}</td><td></td></tr>
      <tr class="r-levy"><td colspan="4" class="lab">Add ${levyPct}% (Markup)</td><td class="val">${m(claim.levy)}</td><td></td></tr>
      <tr class="r-total"><td colspan="4" class="lab">TOTAL</td><td class="val">${m(claim.total)}</td><td></td></tr>
      <tr class="r-bf"><td colspan="4" class="lab">Balance Brought Forward (B/F)</td><td class="val">${m(claim.balanceBroughtForward)}</td><td></td></tr>
      <tr class="r-grand"><td colspan="4" class="lab">GRAND TOTAL (${esc(cur)})</td><td class="val">${m(claim.grandTotal)}</td><td></td></tr>
      <tr class="r-round"><td colspan="4" class="lab">ROUNDED TOTAL (${esc(cur)})</td><td class="val">${rounded}</td><td></td></tr>
    </table>

    <div class="sigs">
      <div class="sig">
        <div class="t">Prepared &amp; Submitted By</div>
        ${sig ? `<img src="${sig}"/>` : ''}
        <div class="ln">${esc(preparer)}</div>
        <div class="meta">Name: ${esc(preparer)}${settings.preparerTitle ? ` (${esc(settings.preparerTitle)})` : ''}</div>
        <div class="meta">Date: ${esc(longDate(claim.datePrepared))}</div>
      </div>
      <div class="sig">
        <div class="t">Approved By</div>
        <div class="ln">${approved ? esc(claim.approvedBy) : ''}</div>
        <div class="meta">Name: ${approved && claim.approvedBy ? esc(claim.approvedBy) : '____________________'}</div>
        <div class="meta">Date: ${approved && claim.approvedDate ? esc(longDate(claim.approvedDate)) : '____________________'}</div>
      </div>
    </div>

    <div class="notes"><b>Notes</b><ol>${noteItems.map((n) => `<li>${n}</li>`).join('')}</ol></div>
    ${settings.bankDetails ? `<div class="notes" style="margin-top:14px"><b>Payment details</b><div style="margin-top:4px;font-size:11.5px">${nl2br(settings.bankDetails)}</div></div>` : ''}
  </div>

  <div class="foot">${footer}</div>
</div></body></html>`;
}
