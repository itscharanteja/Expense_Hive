import {
  jest,
  describe,
  beforeEach,
  afterEach,
  it,
  expect,
} from "@jest/globals";
import { render, fireEvent, act } from "@testing-library/react-native";
import AddExpense from "../../../app/(app)/add-expense";
import { AuthProvider } from "../../../app/context/auth";
import { router } from "expo-router";
import { mockOnAuthStateChanged } from "../../../__mocks__/firebase";
import { User } from "@firebase/auth";

// Mock the router
jest.mock("expo-router", () => ({
  router: {
    back: jest.fn(),
    push: jest.fn(),
  },
}));

// Mock Firebase
jest.mock("../../../app/config/firebase", () => ({
  db: {
    collection: jest.fn(() => ({
      addDoc: jest.fn(),
    })),
  },
}));

const renderWithAuth = (component: React.ReactElement) => {
  return render(<AuthProvider>{component}</AuthProvider>);
};

describe("AddExpense Screen UI", () => {
  beforeEach(() => {
    mockOnAuthStateChanged.mockImplementation(
      (auth: any, callback: (user: User | null) => void) => {
        callback({ uid: "testUID" } as User);
        return () => {};
      }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders all form elements correctly", () => {
    const { getByTestId } = renderWithAuth(<AddExpense />);

    expect(getByTestId("amount-input")).toBeTruthy();
    expect(getByTestId("description-input")).toBeTruthy();
    expect(getByTestId("category-picker")).toBeTruthy();
    expect(getByTestId("save-expense-button")).toBeTruthy();
  });

  it("validates required fields", async () => {
    const { getByTestId } = renderWithAuth(<AddExpense />);

    await act(async () => {
      fireEvent.press(getByTestId("save-expense-button"));
    });

    expect(router.back).not.toHaveBeenCalled();
  });
});
