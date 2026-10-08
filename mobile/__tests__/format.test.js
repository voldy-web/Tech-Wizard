import { fmtDate, fmtPeriod, fmtShort, isPartiallyPaid, money, pad } from '../src/lib/format';

describe('format helpers', () => {
  test('money', () => {
    expect(money(126664.5)).toBe('GH₵ 126,664.50');
    expect(money('0')).toBe('GH₵ 0.00');
    expect(money(null)).toBe('GH₵ 0.00');
  });
  test('dates', () => {
    expect(fmtDate('2025-05-19')).toBe('19 May 2025');
    expect(fmtShort('2025-05-19')).toBe('19 May');
    expect(fmtDate(null)).toBe('—');
  });
  test('period collapses shared month and year', () => {
    expect(fmtPeriod('2025-05-19', '2025-05-25')).toBe('19 – 25 May 2025');
    expect(fmtPeriod('2025-05-28', '2025-06-03')).toBe('28 May – 3 Jun 2025');
    expect(fmtPeriod('2025-12-29', '2026-01-04')).toBe('29 Dec 2025 – 4 Jan 2026');
  });
  test('pad and partially-paid', () => {
    expect(pad(7, 3)).toBe('007');
    expect(isPartiallyPaid({ status: 'APPROVED', amountPaid: 100 })).toBe(true);
    expect(isPartiallyPaid({ status: 'PAID', amountPaid: 100 })).toBe(false);
    expect(isPartiallyPaid({ status: 'APPROVED', amountPaid: 0 })).toBe(false);
  });
});
