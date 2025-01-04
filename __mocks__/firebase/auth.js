const unsubscribe = jest.fn();

const mockAuth = {
  currentUser: null,
  onAuthStateChanged: jest.fn((callback) => {
    console.log("Mock onAuthStateChanged called");
    setTimeout(() => callback(null), 0); // Simulate async auth state change
    return unsubscribe;
  }),
};

const auth = {
  ...mockAuth,
  signOut: jest.fn(() => Promise.resolve()),
};

module.exports = {
  getAuth: jest.fn(() => auth),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  initializeAuth: jest.fn(() => auth),
  getReactNativePersistence: jest.fn(() => ({})),
};