import { formatAmount, toPesewas } from './calc';
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
 * Formal A4 "CERTIFICATE OF CLAIM", laid out like the contractor's paper certificate:
 * navy title banner · project/client/scope/duration block · weekly itemised schedule ·
 * Sub-Total / Levy / Total / Balance B/F / Grand Total · Prepared & Approved boxes · numbered notes.
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
  const hasLetterhead = !!(settings.companyName || logo);

  const rows = items.map((it, i) => {
    const lump = it.type === 'LUMP_SUM';
    const qty = lump ? '1 Item' : `${esc(qtyText(it.qty))}${it.unit ? ` ${esc(it.unit)}` : ''}`;
    return `<tr>
      <td class="c">${i + 1}</td>
      <td>${esc(it.description) || '&nbsp;'}</td>
      <td class="c">${qty}</td>
      <td class="r">${lump ? '1 Item' : m(it.rate)}</td>
      <td class="r">${m(it.amount)}</td>
      <td class="rem">${esc(it.remarks)}</td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" class="c empty">No items</td></tr>';

  const notes = [
    `All amounts are expressed in Ghana Cedis (${esc(cur)}).`,
    `A ${levyPct}% levy has been applied to the sub-total in accordance with applicable statutory requirements.`,
    'Balance Brought Forward (B/F) reflects outstanding amounts carried over from the previous claim period.',
  ];
  const custom = (claim.notes || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const noteItems = [...notes.map((n) => n), ...custom.map(esc)];

  const info = [
    ['Project:', esc(claim.projectName), 'Client:', esc(claim.client) || '—'],
    ['Scope of Work:', nl2br(scope) || '—', 'Duration:', esc(duration(claim.periodFrom, claim.periodTo)) || '—'],
  ];
  if (claim.location) info.push(['Location:', esc(claim.location), 'Week:', `Week ${claim.weekNumber} · ${esc(claim.reference)}`]);

  const footer = `This document is a formal Certificate of Claim — ${esc(claim.projectName)} | Week ${claim.weekNumber}`;

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=794, minimum-scale=0.1, maximum-scale=5, user-scalable=yes"/>
<title>Certificate of Claim ${esc(claim.reference)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm 16mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #ffffff; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; font-size: 12.5px; line-height: 1.35; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { width: 100%; max-width: 794px; margin: 0 auto; padding: 26px 40px 40px; }
  .run { display: flex; justify-content: space-between; color: #8a8a8a; font-size: 12px; padding-bottom: 4px; border-bottom: 1px solid #2e75b6; margin-bottom: 8px; }
  .letter { display: flex; align-items: center; gap: 12px; margin: 6px 0 8px; }
  .logo { width: 48px; height: 48px; border-radius: 6px; background: #1b3a5c; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 17px; overflow: hidden; flex: none; }
  .logo img { width: 100%; height: 100%; object-fit: contain; background: #fff; }
  .co { font-weight: 700; font-size: 15px; color: #1b3a5c; } .addr { color: #555; font-size: 11px; }
  .banner { background: #1b3a5c; color: #fff; text-align: center; padding: 20px 10px 18px; }
  .banner h1 { margin: 0; font-size: 30px; letter-spacing: 1px; }
  .banner .sub { font-style: italic; color: #b9c9dc; margin-top: 6px; font-size: 14px; }
  table { border-collapse: collapse; width: 100%; }
  .info { margin: 24px 0 24px; }
  .info td { padding: 8px 10px; vertical-align: top; background: #d6e4f0; }
  .info td.l { width: 15%; font-weight: 700; color: #1b3a5c; } .info td.v { background: #fff; width: 35%; }
  .info td.v + td.l { background: #d6e4f0; }
  .info tr td:first-child { background: #d6e4f0; }
  .week { background: #2e75b6; color: #fff; font-weight: 700; text-align: center; padding: 7px; letter-spacing: .4px; font-size: 13px; }
  .grid th { background: #1b3a5c; color: #fff; padding: 8px 6px; font-size: 13px; border: 1px solid #fff; }
  .grid td { padding: 7px 8px; border: 1px solid #c3d2e3; }
  .grid tbody tr:nth-child(even) td { background: #f0f4fa; }
  .grid tbody tr { page-break-inside: avoid; }
  td.c, th.c { text-align: center; } td.r { text-align: right; white-space: nowrap; } td.rem { font-size: 11px; color: #444; }
  td.empty { color: #777; padding: 16px; }
  .tot td { padding: 9px 8px; border: 1px solid #c3d2e3; }
  .tot .lab { font-weight: 700; } .tot .val { text-align: center; font-weight: 700; white-space: nowrap; }
  .tot .sub td { background: #d6e4f0; color: #1b3a5c; }
  .tot .levy td { background: #fff; } .tot .levy .val { color: #c0392b; }
  .tot .total td { background: #1b3a5c; color: #fff; }
  .tot .bf td { background: #d6e4f0; color: #1b3a5c; }
  .tot .grand td { background: #2e75b6; color: #fff; }
  .tot .blank { background: #fff !important; border: none; }
  .tot { page-break-inside: avoid; }
  .sigs { display: flex; gap: 38px; margin-top: 34px; page-break-inside: avoid; }
  .sig { flex: 1; background: #f0f4fa; padding: 14px 16px; min-height: 130px; }
  .sig .t { font-weight: 700; color: #1b3a5c; font-size: 14px; }
  .sig .ln { border-bottom: 1px solid #333; margin-top: 24px; min-height: 22px; font-weight: 700; padding-bottom: 2px; }
  .sig img { max-height: 44px; max-width: 60%; display: block; margin-top: 8px; }
  .sig .meta { font-size: 12px; margin-top: 6px; } .sig .blank { color: #333; }
  .notes { margin-top: 26px; border-left: 4px solid #2e75b6; padding-left: 12px; page-break-inside: avoid; }
  .notes b { color: #1b3a5c; font-size: 14px; } .notes ol { margin: 6px 0 0 0; padding-left: 20px; font-size: 12px; } .notes li { margin: 2px 0; }
  .foot { margin-top: 26px; border-top: 1px solid #2e75b6; padding-top: 6px; text-align: center; color: #8a8a8a; font-style: italic; font-size: 11px; }
</style></head>
<body><div class="page">
  <div class="run"><span>CERTIFICATE OF CLAIM</span><span>${esc(claim.projectName)}</span></div>
  ${hasLetterhead ? `<div class="letter">
    <div class="logo">${logo ? `<img src="${logo}"/>` : esc(initials(settings.companyName))}</div>
    <div><div class="co">${esc(settings.companyName)}</div>
    <div class="addr">${[settings.address, settings.phone, settings.email, settings.tin && `TIN: ${settings.tin}`].filter(Boolean).map(esc).join(' • ')}</div></div>
  </div>` : ''}

  <div class="banner"><h1>CERTIFICATE OF CLAIM</h1>${subtitle ? `<div class="sub">${esc(subtitle)}</div>` : ''}</div>

  <table class="info">${info.map((r) => `<tr><td class="l">${r[0]}</td><td class="v">${r[1]}</td><td class="l">${r[2]}</td><td class="v">${r[3]}</td></tr>`).join('')}</table>

  <table class="grid">
    <thead>
      <tr><td colspan="6" class="week">WEEK ${claim.weekNumber} — ITEMISED SCHEDULE OF WORKS</td></tr>
      <tr><th class="c" style="width:7%">Item</th><th style="text-align:left">Description</th><th class="c" style="width:15%">Qty</th><th style="width:14%">Unit Price<br/>(${esc(cur)})</th><th style="width:14%">Amount<br/>(${esc(cur)})</th><th style="width:12%">Remarks</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <table class="tot">
    <tr class="sub"><td style="width:7%"></td><td class="lab" style="padding-left:14px">Sub-Total</td><td class="val" style="width:15%">${m(claim.subTotal)}</td><td class="blank" colspan="3"></td></tr>
    <tr class="levy"><td></td><td class="lab">Add ${levyPct}% (Levy)</td><td class="val">${m(claim.levy)}</td><td class="blank" colspan="3"></td></tr>
    <tr class="total"><td></td><td class="lab">TOTAL</td><td class="val">${m(claim.total)}</td><td class="blank" colspan="3"></td></tr>
    <tr class="bf"><td></td><td class="lab">Balance Brought Forward (B/F)</td><td class="val">${m(claim.balanceBroughtForward)}</td><td class="blank" colspan="3"></td></tr>
    <tr class="grand"><td></td><td class="lab">GRAND TOTAL</td><td class="val">${esc(cur)} ${m(claim.grandTotal)}</td><td class="blank" colspan="3"></td></tr>
  </table>

  <div class="sigs">
    <div class="sig">
      <div class="t">Prepared &amp; Submitted By:</div>
      ${sig ? `<img src="${sig}"/>` : ''}
      <div class="ln">${esc(preparer)}</div>
      <div class="meta">Name: ${esc(preparer)}${settings.preparerTitle ? ` (${esc(settings.preparerTitle)})` : ''}</div>
      <div class="meta">Date: ${esc(longDate(claim.datePrepared))}</div>
    </div>
    <div class="sig">
      <div class="t">Approved By:</div>
      <div class="ln">${approved ? esc(claim.approvedBy) : ''}</div>
      <div class="meta">Name: ${approved && claim.approvedBy ? esc(claim.approvedBy) : '<span class="blank">____________________</span>'}</div>
      <div class="meta">Date: ${approved && claim.approvedDate ? esc(longDate(claim.approvedDate)) : '<span class="blank">____________________</span>'}</div>
    </div>
  </div>

  <div class="notes"><b>Notes:</b><ol>${noteItems.map((n) => `<li>${n}</li>`).join('')}</ol></div>
  ${settings.bankDetails ? `<div class="notes" style="margin-top:14px"><b>Payment details:</b><div style="margin-top:4px;font-size:12px">${nl2br(settings.bankDetails)}</div></div>` : ''}

  <div class="foot">${footer}</div>
</div></body></html>`;
}
