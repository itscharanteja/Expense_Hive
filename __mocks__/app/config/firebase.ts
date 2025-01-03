export const auth = {
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn((callback: (user: any) => void) => {
    callback(null);
    return jest.fn();
  }),
  currentUser: null,
} as any;

export const db = {
  collection: jest.fn(() => ({
    doc: jest.fn(),
    add: jest.fn(),
  })),
  doc: jest.fn(),
} as any;

export default { auth, db };
