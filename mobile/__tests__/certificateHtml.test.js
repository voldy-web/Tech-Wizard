import { buildCertificateHtml } from '../src/lib/certificateHtml';

const claim = {
  reference: 'TW-ELR-009', weekNumber: 9, periodFrom: '2025-05-19', periodTo: '2025-05-25', datePrepared: '2025-05-24',
  projectName: 'East Legon <Res> & Co', client: 'Mr. Kofi Osei', scopeOfWork: 'Framing', location: 'Accra',
  status: 'DRAFT', levyPercent: 7, balanceBroughtForward: 12450, subTotal: 41600, levy: 2912, total: 44512, grandTotal: 56962,
  notes: 'Pay in 14 days', preparedBy: 'Kwame Addae',
  items: [
    { type: 'MEASURED', description: 'Ready-Mix Concrete C25/30', qty: 24, unit: 'm³', rate: 1150, amount: 27600, remarks: 'Slab casting' },
    { type: 'LUMP_SUM', description: 'Rebar labour', qty: 1, unit: 'Item', rate: null, amount: 7500 },
  ],
};

describe('certificate html', () => {
  const html = buildCertificateHtml(claim, { companyName: 'Addae & Associates', currency: 'GH₵', logoUrl: 'javascript:alert(1)' });

  test('follows the paper certificate layout: banner, info block, schedule, totals, boxes, notes', () => {
    expect(html).toContain('CERTIFICATE OF CLAIM');
    expect(html).toContain('Project:');
    expect(html).toContain('Scope of Work:');
    expect(html).toContain('Duration:');
    expect(html).toContain('19 – 25 May 2025');
    expect(html).toContain('WEEK 9 — ITEMISED SCHEDULE OF WORKS');
    expect(html).toContain('Unit Price');
    expect(html).toContain('Sub-Total');
    expect(html).toContain('Add 7% (Levy)');
    expect(html).toContain('Balance Brought Forward (B/F)');
    expect(html).toContain('GRAND TOTAL');
    expect(html).toContain('Prepared &amp; Submitted By:');
    expect(html).toContain('Approved By:');
    expect(html).toContain('Notes:');
    expect(html).toContain('All amounts are expressed in Ghana Cedis');
  });

  test('shows server totals', () => {
    expect(html).toContain('41,600.00');
    expect(html).toContain('2,912.00');
    expect(html).toContain('44,512.00');
    expect(html).toContain('12,450.00');
    expect(html).toContain('GH₵ 56,962.00');
  });

  test('measured rows show qty with unit; lump sums show 1 Item', () => {
    expect(html).toContain('24 m³');
    expect(html).toMatch(/Rebar labour[\s\S]*?<td class="c">1 Item<\/td>\s*<td class="r">1 Item<\/td>/);
  });

  test('user notes are appended; approver details stay blank until approved', () => {
    expect(html).toContain('Pay in 14 days');
    expect(html).toContain('____________________');
    const approvedHtml = buildCertificateHtml({ ...claim, status: 'APPROVED', approvedBy: 'Kofi Osei', approvedDate: '2025-05-26' }, {});
    expect(approvedHtml).toContain('Kofi Osei');
    expect(approvedHtml).toContain('26 May 2025');
  });

  test('escapes user text and rejects unsafe image sources', () => {
    expect(html).toContain('East Legon &lt;Res&gt; &amp; Co');
    expect(html).not.toContain('<Res>');
    expect(html).not.toContain('javascript:');
  });

});
