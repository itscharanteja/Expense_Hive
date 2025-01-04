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

jest.mock("@firebase/firestore", () => ({
  getFirestore: () => ({
    collection: jest.fn(),
    doc: jest.fn(),
  }),
}));

export default {
  getAuth: mockGetAuth,
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
  signOut: mockSignOut,
  onAuthStateChanged: mockOnAuthStateChanged,
};
