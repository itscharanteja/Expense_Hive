// jest.setup.js
import "@testing-library/jest-native/extend-expect";

import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

jest.mock("@firebase/auth", () => {
  const mockOnAuthStateChanged = jest.fn();
  const mockSignOut = jest.fn();
  const mockSignInWithEmailAndPassword = jest.fn();

  return {
    getAuth: () => ({
      onAuthStateChanged: mockOnAuthStateChanged,
      signOut: mockSignOut,
      signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
    }),
  };
});

jest.mock(
  "react-native/Libraries/Components/StatusBar/StatusBar",
  () => "StatusBar"
);

// Mock Platform
jest.mock("react-native/Libraries/Utilities/Platform", () => ({
  OS: "ios",
  select: jest.fn((obj) => obj.ios),
}));

const originalError = console.error;
console.error = (...args) => {
  if (
    args[0].includes("Warning: An update to Animated") ||
    args[0].includes("Error initializing auth:") ||
    args[0].includes("act(...)")
  ) {
    return;
  }
  originalError.call(console, ...args);
};
