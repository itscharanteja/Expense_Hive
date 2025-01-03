import "@testing-library/jest-native/extend-expect";
import { jest } from "@jest/globals";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock Firebase
jest.mock("./app/config/firebase", () => ({
  auth: {
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
    currentUser: null,
  },
  db: {
    collection: jest.fn(),
    doc: jest.fn(),
  },
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  Tabs: ({ children }) => children,
  Screen: () => null,
}));

// Mock Ionicons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// Mock LinearGradient
jest.mock("expo-linear-gradient", () => ({
  LinearGradient: "LinearGradient",
}));
