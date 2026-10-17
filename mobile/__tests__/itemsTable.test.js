import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ItemsTable, { TotalsTable } from '../src/components/ItemsTable';
import { computeTotals } from '../src/lib/calc';

jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => null }));

const items = [
  { key: 'a', type: 'LUMP_SUM', description: 'General Labour', qty: '1', unit: 'Item', rate: '', amount: '16050', enteredAmount: null, remarks: '' },
  { key: 'b', type: 'MEASURED', description: 'Cement', qty: '450', unit: 'Bags', rate: '120', amount: '', enteredAmount: null, remarks: 'Grade 42.5R' },
];
const handlers = () => ({ onChange: jest.fn(), onDuplicate: jest.fn(), onDelete: jest.fn(), onToggleType: jest.fn(), onPickUnit: jest.fn(), onAdd: jest.fn() });

describe('ItemsTable (paper-certificate style entry)', () => {
  test('has the certificate columns and calculates measured amounts', () => {
    render(<ItemsTable items={items} currency="GH₵" {...handlers()} />);
    ['Item', 'Description', 'Qty', 'Unit Price\n(GH₵)', 'Amount\n(GH₵)'].forEach((h) => expect(screen.getAllByText(h).length).toBeGreaterThan(0));
    expect(screen.getByText('54,000.00')).toBeTruthy();          // 450 x 120, calculated
    expect(screen.getByDisplayValue('16050')).toBeTruthy();      // lump sum typed directly
    expect(screen.getByDisplayValue('1 Item')).toBeTruthy();       // lump-sum Qty is free text
    expect(screen.getByText('↳ Grade 42.5R')).toBeTruthy();   // remarks shown quietly when the row is closed
    expect(screen.getByText('Bags')).toBeTruthy();            // unit sits under the quantity
  });

  test('typing reports the change for the right row and field', () => {
    const h = handlers();
    render(<ItemsTable items={items} currency="GH₵" {...h} />);
    fireEvent.changeText(screen.getByDisplayValue('450'), '500');
    expect(h.onChange).toHaveBeenCalledWith('b', { qty: '500' });
    fireEvent.changeText(screen.getByDisplayValue('16050'), '17000');
    expect(h.onChange).toHaveBeenCalledWith('a', { amount: '17000' });
    fireEvent.press(screen.getByText('Add row'));
    expect(h.onAdd).toHaveBeenCalledWith('MEASURED');
    fireEvent.press(screen.getByText('Add lump sum'));
    expect(h.onAdd).toHaveBeenCalledWith('LUMP_SUM');
  });

  test('extra controls appear only for the row being edited', () => {
    const h = handlers();
    render(<ItemsTable items={items} currency="GH₵" {...h} />);
    expect(screen.queryByText('MEASURED')).toBeNull();          // closed: no type chip, no copy/delete
    fireEvent.press(screen.getByLabelText('Row 2 options'));    // tap the row number
    expect(screen.getByText('MEASURED')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Toggle measured or lump sum'));
    expect(h.onToggleType).toHaveBeenCalledWith('b');
    fireEvent.press(screen.getByLabelText('Row 2 options'));    // tap again to close
    expect(screen.queryByText('MEASURED')).toBeNull();
  });

  test('focusing a field opens that row', () => {
    render(<ItemsTable items={items} currency="GH₵" {...handlers()} />);
    fireEvent(screen.getByDisplayValue('450'), 'focus');
    expect(screen.getByText('MEASURED')).toBeTruthy();
  });

  test('read-only hides the add buttons', () => {
    render(<ItemsTable items={items} currency="GH₵" readOnly {...handlers()} />);
    expect(screen.queryByText('Add row')).toBeNull();
  });

  test('totals block shows sub-total, levy, total, B/F and grand total', () => {
    const t = computeTotals(items, '7', '7734');
    render(<TotalsTable totals={t} currency="GH₵" levyPercent="7" balanceBroughtForward="7734" onLevy={jest.fn()} onBalance={jest.fn()} weekNumber={2} />);
    expect(screen.getByText('70,050.00')).toBeTruthy();   // 16,050 + 54,000
    expect(screen.getByText('4,903.50')).toBeTruthy();    // 7%
    expect(screen.getByText('74,953.50')).toBeTruthy();
    expect(screen.getByText('GH₵ 82,687.50')).toBeTruthy();
  });
});

describe('TotalsTable typing', () => {
  test('B/F and markup inputs keep the same element while typing (no remount, so focus is not lost)', () => {
    const totals = { subTotal: 1000, levy: 0, total: 1000, grandTotal: 1000 };
    function Harness() {
      const [bf, setBf] = React.useState('5');
      const [lv, setLv] = React.useState('7');
      return <TotalsTable totals={totals} currency="GH₵" levyPercent={lv} onLevy={setLv} balanceBroughtForward={bf} onBalance={setBf} weekNumber={2} />;
    }
    render(<Harness />);
    const bfBefore = screen.getByDisplayValue('5');
    fireEvent.changeText(bfBefore, '50');
    expect(screen.getByDisplayValue('50')).toBe(bfBefore);
    const lvBefore = screen.getByDisplayValue('7');
    fireEvent.changeText(lvBefore, '75');
    expect(screen.getByDisplayValue('75')).toBe(lvBefore);
  });
});

describe('TotalsTable rounded total', () => {
  test('shows a ROUNDED TOTAL row after the grand total, rounded up', () => {
    const t = computeTotals([{ type: 'LUMP_SUM', amount: '24815' }], '0', '0');
    render(<TotalsTable totals={t} currency="GH₵" levyPercent="0" onLevy={() => {}} balanceBroughtForward="0" onBalance={() => {}} weekNumber={1} />);
    expect(screen.getByText('ROUNDED TOTAL')).toBeTruthy();
    expect(screen.getByTestId('rounded-total').props.children).toBe('GH₵ 25,000.00');
  });
});
