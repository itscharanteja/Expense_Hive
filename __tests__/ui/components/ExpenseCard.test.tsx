import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import ExpenseCard from "../../../app/components/ExpenseCard";

describe("ExpenseCard UI", () => {
  const mockProps = {
    description: "Grocery Shopping",
    amount: 150.75,
    date: new Date("2024-03-20"),
    paidBy: "john@example.com",
    onPress: jest.fn(),
    onLongPress: jest.fn(),
  };

  it("renders with correct styling", () => {
    const { getByText } = render(<ExpenseCard {...mockProps} />);

    const description = getByText("Grocery Shopping");
    const amount = getByText("150.75 kr");
    const paidBy = getByText("Paid by john@example.com");

    expect(description).toHaveStyle({
      fontSize: 16,
      fontWeight: "500",
    });

    expect(amount).toHaveStyle({
      fontSize: 16,
      fontWeight: "bold",
    });
  });

  it("handles touch interactions correctly", () => {
    const { getByText } = render(<ExpenseCard {...mockProps} />);

    fireEvent.press(getByText("Grocery Shopping"));
    expect(mockProps.onPress).toHaveBeenCalledTimes(1);

    fireEvent(getByText("Grocery Shopping"), "onLongPress");
    expect(mockProps.onLongPress).toHaveBeenCalledTimes(1);
  });
});
