export const mockOnAuthStateChanged = jest.fn();
export const mockSignOut = jest.fn();
export const mockSignInWithEmailAndPassword = jest.fn();
export const mockGetAuth = jest.fn();

jest.mock("@firebase/auth", () => ({
  getAuth: () => ({
    onAuthStateChanged: mockOnAuthStateChanged,
    signOut: mockSignOut,
    signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  }),
}));
