import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ExpenseCard from '../../app/components/ExpenseCard';

describe('ExpenseCard', () => {
  const mockProps = {
    description: 'Test Expense',
    amount: 100.50,
    date: new Date('2024-03-20'),
    paidBy: 'test@user.com',
    onPress: jest.fn(),
    onLongPress: jest.fn(),
  };

  it('renders expense details correctly', () => {
    const { getByText } = render(<ExpenseCard {...mockProps} />);

    expect(getByText('Test Expense')).toBeTruthy();
    expect(getByText('100.50 kr')).toBeTruthy();
    expect(getByText('Paid by test@user.com')).toBeTruthy();
    expect(getByText(mockProps.date.toLocaleDateString())).toBeTruthy();
  });

  it('handles press events', () => {
    const { getByText } = render(<ExpenseCard {...mockProps} />);
    
    fireEvent.press(getByText('Test Expense'));
    expect(mockProps.onPress).toHaveBeenCalled();
  });

  it('handles long press events', () => {
    const { getByText } = render(<ExpenseCard {...mockProps} />);
    
    fireEvent(getByText('Test Expense'), 'onLongPress');
    expect(mockProps.onLongPress).toHaveBeenCalled();
  });
}); 