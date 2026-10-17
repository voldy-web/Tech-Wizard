import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import ClaimRow from '../src/components/ClaimRow';
import { EmptyState, ErrorState, StatusBadge } from '../src/components/ui';

jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => null }));

const base = {
  index: 0, drag: jest.fn(), isActive: false, currency: 'GH₵', readOnly: false,
  onChange: jest.fn(), onDuplicate: jest.fn(), onDelete: jest.fn(), onToggleType: jest.fn(), onPickUnit: jest.fn(),
};
const measured = { key: 'a', type: 'MEASURED', description: 'Cement', qty: '450', unit: 'Bags', rate: '120', amount: '', enteredAmount: null, remarks: '' };

describe('ClaimRow, badges and states', () => {
  const claim = { id: 1, weekNumber: 14, projectName: 'Cantonments Office Suites', grandTotal: 42300, outstanding: 1000, status: 'SUBMITTED', amountPaid: 0 };

  test('ClaimRow shows number, week, project, amount and status', () => {
    const onPress = jest.fn();
    render(<ClaimRow claim={claim} onPress={onPress} />);
    expect(screen.getByText('Week 14')).toBeTruthy();
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

describe('network error offers offline mode', () => {
  test('"Work offline" switches to on-phone data and retries', () => {
    const { getDataMode, setDataMode } = require('../src/api/client');
    setDataMode('cloud');
    const onRetry = jest.fn();
    render(<ErrorState error={{ isNetwork: true, message: 'x' }} onRetry={onRetry} />);
    fireEvent.press(screen.getByText('Work offline (data stays on this phone)'));
    expect(getDataMode()).toBe('local');
    expect(onRetry).toHaveBeenCalled();
  });
  test('non-network errors do not offer it', () => {
    render(<ErrorState error={{ message: 'boom' }} onRetry={jest.fn()} />);
    expect(screen.queryByText('Work offline (data stays on this phone)')).toBeNull();
  });
});
