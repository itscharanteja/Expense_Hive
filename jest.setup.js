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
