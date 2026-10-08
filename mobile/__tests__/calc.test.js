import {
  computeTotals, rowAmount, hasMismatch, toPesewas, formatMoney, formatAmount, levyAmount,
  amountInWords, outstanding, toDecimalString,
} from '../src/lib/calc';

const lump = (description, amount) => ({ type: 'LUMP_SUM', description, amount: String(amount) });
const measured = (description, qty, unit, rate) => ({ type: 'MEASURED', description, qty: String(qty), unit, rate: String(rate) });

// Shared reference case - identical to backend ClaimCalculatorTest.referenceCase()
const referenceItems = [
  lump('General Labour', 16050),
  measured('Cement', 450, 'Bags', '120.00'),
  measured('Sand', 1, 'Load', 3000),
  measured('Dust', 1, 'Load', 5600),
  measured('Stone', 4, 'Loads', 4000),
  lump('Electricals', 7000),
  lump('Plumbing', 1500),
  lump('Steel Labour', 8000),
];

describe('claim calculations (integer pesewas)', () => {
  test('reference case', () => {
    const t = computeTotals(referenceItems, 7, 7734);
    expect(t.subTotal).toBe(11115000);
    expect(t.levy).toBe(778050);
    expect(t.total).toBe(11893050);
    expect(t.grandTotal).toBe(12666450);
    expect(formatMoney(t.subTotal)).toBe('GH₵ 111,150.00');
    expect(formatMoney(t.levy)).toBe('GH₵ 7,780.50');
    expect(formatMoney(t.total)).toBe('GH₵ 118,930.50');
    expect(formatMoney(t.grandTotal)).toBe('GH₵ 126,664.50');
  });

  test('measured amount is qty x rate and ignores any typed amount', () => {
    expect(rowAmount({ type: 'MEASURED', qty: '450', rate: '120', amount: '1' })).toBe(5400000);
  });

  test('lump sum uses the entered amount', () => {
    expect(rowAmount(lump('x', '16,050.00'))).toBe(1605000);
  });

  test('rounds half up like BigDecimal', () => {
    expect(rowAmount(measured('x', '0.5', 'm', '0.01'))).toBe(1);   // 0.005 -> 0.01
    expect(levyAmount(485, 7)).toBe(34);                              // 0.3395 -> 0.34
    expect(toPesewas('1.005')).toBe(101);
  });

  test('decimal quantities stay exact', () => {
    expect(rowAmount(measured('Rebar', '1.2', 'Tons', '6500'))).toBe(780000);
    expect(rowAmount(measured('Concrete', '24.0', 'm3', '1150'))).toBe(2760000);
  });

  test('blank and invalid input counts as zero', () => {
    expect(computeTotals([{ type: 'MEASURED', qty: '', rate: 'abc' }], '', undefined).grandTotal).toBe(0);
  });

  test('mismatch warning flags entered amount that differs from qty x rate', () => {
    const row = { ...measured('Pump', 2, 'Days', 1500), enteredAmount: '3800' };
    expect(hasMismatch(row)).toBe(true);
    expect(hasMismatch({ ...row, enteredAmount: '3000' })).toBe(false);
    expect(hasMismatch(measured('Pump', 2, 'Days', 1500))).toBe(false);
    expect(hasMismatch({ ...lump('x', 100), enteredAmount: '5' })).toBe(false);
  });

  test('outstanding = grandTotal - amountPaid', () => {
    expect(outstanding(2875000, 1630000)).toBe(1245000);
  });

  test('formatting', () => {
    expect(formatMoney(12666400)).toBe('GH₵ 126,664.00');
    expect(formatAmount(-5)).toBe('-0.05');
    expect(toDecimalString(778050)).toBe('7780.50');
  });

  test('amount in words', () => {
    expect(amountInWords(5696200)).toBe('Fifty-Six Thousand Nine Hundred and Sixty-Two Ghana Cedis Only');
    expect(amountInWords(12666450)).toBe('One Hundred and Twenty-Six Thousand Six Hundred and Sixty-Four Ghana Cedis and Fifty Pesewas Only');
    expect(amountInWords(0)).toBe('Zero Ghana Cedis Only');
  });
});
