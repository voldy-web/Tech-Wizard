import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import LineItemCard from '../src/components/LineItemCard';
import ClaimRow from '../src/components/ClaimRow';
import { EmptyState, ErrorState, StatusBadge } from '../src/components/ui';

jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => null }));

const base = {
  index: 0, drag: jest.fn(), isActive: false, currency: 'GH₵', readOnly: false,
  onChange: jest.fn(), onDuplicate: jest.fn(), onDelete: jest.fn(), onToggleType: jest.fn(), onPickUnit: jest.fn(),
};
const measured = { key: 'a', type: 'MEASURED', description: 'Cement', qty: '450', unit: 'Bags', rate: '120', amount: '', enteredAmount: null, remarks: '' };

describe('LineItemCard', () => {
  beforeEach(() => jest.clearAllMocks());

  test('measured row shows live qty x rate amount', () => {
    render(<LineItemCard {...base} item={measured} />);
    expect(screen.getByText('MEASURED')).toBeTruthy();
    expect(screen.getByText('GH₵ 54,000.00')).toBeTruthy();
  });

  test('lump sum row shows the entered amount with qty 1 / Item', () => {
    render(<LineItemCard {...base} item={{ ...measured, type: 'LUMP_SUM', qty: '1', unit: 'Item', rate: '', amount: '16050' }} />);
    expect(screen.getByText('LUMP SUM')).toBeTruthy();
    expect(screen.getByText('Qty 1 · Item')).toBeTruthy();
    expect(screen.getByText('GH₵ 16,050.00')).toBeTruthy();
  });

  test('warning badge appears only when entered amount differs from qty x rate', () => {
    const { rerender } = render(<LineItemCard {...base} item={{ ...measured, qty: '2', rate: '1500', enteredAmount: '3800' }} />);
    expect(screen.getByText('AUDIT ALERT')).toBeTruthy();
    expect(screen.getByText(/Mismatch: 2 × 1,500.00 = GH₵ 3,000.00/)).toBeTruthy();
    fireEvent.press(screen.getByText('AUTO-RECALC'));
    expect(base.onChange).toHaveBeenCalledWith({ enteredAmount: null });

    rerender(<LineItemCard {...base} item={{ ...measured, qty: '2', rate: '1500', enteredAmount: '3000' }} />);
    expect(screen.queryByText('AUDIT ALERT')).toBeNull();
  });

  test('typing and tapping call the handlers; read-only hides actions', () => {
    const { rerender } = render(<LineItemCard {...base} item={measured} />);
    fireEvent.changeText(screen.getByDisplayValue('450'), '500');
    expect(base.onChange).toHaveBeenCalledWith({ qty: '500' });
    fireEvent.press(screen.getByText('MEASURED'));
    expect(base.onToggleType).toHaveBeenCalled();
    fireEvent.press(screen.getByText('Bags'));
    expect(base.onPickUnit).toHaveBeenCalled();

    rerender(<LineItemCard {...base} readOnly item={measured} />);
    expect(screen.queryByText('Enter amount')).toBeNull();
  });
});

describe('ClaimRow, badges and states', () => {
  const claim = { id: 1, weekNumber: 14, projectName: 'Cantonments Office Suites', grandTotal: 42300, outstanding: 1000, status: 'SUBMITTED', amountPaid: 0 };

  test('ClaimRow shows number, week, project, amount and status', () => {
    const onPress = jest.fn();
    render(<ClaimRow claim={claim} onPress={onPress} />);
    expect(screen.getByText(/Claim #014/)).toBeTruthy();
    expect(screen.getByText('Cantonments Office Suites')).toBeTruthy();
    expect(screen.getByText('GH₵ 42,300.00')).toBeTruthy();
    expect(screen.getByText('SUBMITTED')).toBeTruthy();
    fireEvent.press(screen.getByText('Cantonments Office Suites'));
    expect(onPress).toHaveBeenCalled();
  });

  test('partially paid approved claim is labelled', () => {
    render(<StatusBadge status="APPROVED" partial />);
    expect(screen.getByText('PARTIALLY PAID')).toBeTruthy();
  });

  test('network error state explains the problem and offers retry', () => {
    const onRetry = jest.fn();
    render(<ErrorState error={{ isNetwork: true, message: "Can't reach the Tech Wizard server at http://x:8080." }} onRetry={onRetry} />);
    expect(screen.getByText('Can’t reach the server')).toBeTruthy();
    fireEvent.press(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalled();
  });

  test('empty state with action', () => {
    const onAction = jest.fn();
    render(<EmptyState title="No projects yet" message="Add one" actionTitle="Add a project" onAction={onAction} />);
    fireEvent.press(screen.getByText('Add a project'));
    expect(onAction).toHaveBeenCalled();
  });
});

describe('network error offers demo data', () => {
  test('"Use demo data instead" switches to demo mode and retries', () => {
    const { isMockMode, setMockMode } = require('../src/api/client');
    setMockMode(false);
    const onRetry = jest.fn();
    render(<ErrorState error={{ isNetwork: true, message: 'x' }} onRetry={onRetry} />);
    fireEvent.press(screen.getByText('Use demo data instead'));
    expect(isMockMode()).toBe(true);
    expect(onRetry).toHaveBeenCalled();
  });
  test('non-network errors do not offer it', () => {
    render(<ErrorState error={{ message: 'boom' }} onRetry={jest.fn()} />);
    expect(screen.queryByText('Use demo data instead')).toBeNull();
  });
});
