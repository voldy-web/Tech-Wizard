import { blankItem, fromServerItem, switchType, toServerItem } from '../src/lib/claimModel';
import { rowAmount } from '../src/lib/calc';

describe('claim model', () => {
  test('server measured item -> editable strings; lump sum forced to qty 1 / Item', () => {
    const m = fromServerItem({ type: 'MEASURED', description: 'Cement', qty: 450, unit: 'Bags', rate: 120, amount: 54000, enteredAmount: null });
    expect(m).toMatchObject({ qty: '450', unit: 'Bags', rate: '120', enteredAmount: null });
    const l = fromServerItem({ type: 'LUMP_SUM', description: 'Labour', qty: 1, unit: 'Item', amount: 16050 });
    expect(l).toMatchObject({ qty: '1', unit: 'Item', amount: '16050' });
  });

  test('toServerItem: lump sum sends amount; measured sends qty/rate and only a differing entered amount', () => {
    expect(toServerItem({ ...blankItem('LUMP_SUM'), description: 'x', amount: '1,500' })).toMatchObject({ type: 'LUMP_SUM', amount: '1500.00' });
    const m = { ...blankItem('MEASURED', 'Days'), description: 'Pump', qty: '2', rate: '1500', enteredAmount: '3800' };
    expect(toServerItem(m)).toMatchObject({ type: 'MEASURED', qty: '2', rate: '1500.00', enteredAmount: '3800' });
    expect(toServerItem({ ...m, enteredAmount: null }).enteredAmount).toBeUndefined();
    expect(toServerItem({ ...m, enteredAmount: '' }).enteredAmount).toBeUndefined();
  });

  test('switching type carries the figure across', () => {
    const m = { ...blankItem('MEASURED'), qty: '2', rate: '1500' };
    const l = switchType(m);
    expect(l.type).toBe('LUMP_SUM');
    expect(rowAmount(l)).toBe(300000);
    const back = switchType(l);
    expect(back.type).toBe('MEASURED');
    expect(rowAmount(back)).toBe(300000);
  });

  test('blank items get unique keys', () => {
    expect(blankItem().key).not.toBe(blankItem().key);
  });
});
