import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import DateField, { monthGrid } from '../src/components/DateField';

jest.mock('@expo/vector-icons', () => ({ MaterialCommunityIcons: () => null }));

describe('monthGrid', () => {
  test('October 2026 starts on a Thursday and has 31 days in 5 weeks', () => {
    const g = monthGrid(2026, 9);
    expect(g.length).toBe(5);
    expect(g[0].indexOf(1)).toBe(4);
    expect(g.flat().filter(Boolean).length).toBe(31);
  });
  test('February 2028 (leap year) has 29 days', () => {
    expect(monthGrid(2028, 1).flat().filter(Boolean).length).toBe(29);
  });
});

describe('DateField calendar', () => {
  test('opens a calendar, moves to the next month (and across the year end) and picks a day', () => {
    const onChange = jest.fn();
    render(<DateField label="Date paid" value="2026-12-17" onChange={onChange} />);
    expect(screen.getByText('17 Dec 2026')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Date paid: choose date'));
    expect(screen.getByText('December 2026')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Next month'));
    expect(screen.getByText('January 2027')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Pick 5 January 2027'));
    expect(onChange).toHaveBeenCalledWith('2027-01-05');
  });
  test('previous month and year arrows', () => {
    render(<DateField label="D" value="2026-01-10" onChange={() => {}} />);
    fireEvent.press(screen.getByLabelText('D: choose date'));
    fireEvent.press(screen.getByLabelText('Previous month'));
    expect(screen.getByText('December 2025')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Next year'));
    expect(screen.getByText('December 2026')).toBeTruthy();
  });
  test('a read-only field does not open', () => {
    render(<DateField label="D" value="2026-01-10" onChange={() => {}} editable={false} />);
    fireEvent.press(screen.getByLabelText('D: choose date'));
    expect(screen.queryByText('January 2026')).toBeNull();
  });
});
