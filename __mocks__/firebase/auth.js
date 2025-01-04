export const mockOnAuthStateChanged = jest.fn();
export const mockSignOut = jest.fn();
export const mockSignInWithEmailAndPassword = jest.fn();
export const mockGetReactNativePersistence = jest.fn(() => ({}));
export const mockInitializeAuth = jest.fn(() => ({
  currentUser: null,
  onAuthStateChanged: mockOnAuthStateChanged,
  signOut: mockSignOut,
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
}));

export const getAuth = jest.fn(() => ({
  currentUser: null,
  onAuthStateChanged: mockOnAuthStateChanged,
  signOut: mockSignOut,
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
}));

// Named exports
export const signInWithEmailAndPassword = mockSignInWithEmailAndPassword;
export const signOut = mockSignOut;
export const initializeAuth = mockInitializeAuth;
export const getReactNativePersistence = mockGetReactNativePersistence;
