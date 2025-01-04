import React, { useState, useEffect } from "react";
import { render, fireEvent, act, waitFor } from "@testing-library/react-native";
import { AuthProvider } from "../../app/context/auth";
import Login from "../../app/(auth)/login";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Image } from "react-native";

// 1) Mock the modular signInWithEmailAndPassword function
jest.mock("firebase/auth", () => {
  const originalModule = jest.requireActual("firebase/auth");
  return {
    ...originalModule,
    signInWithEmailAndPassword: jest.fn(),
  };
});

// 2) Mock expo-router
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock("react-native/Libraries/Image/Image", () => "Image");

// Error Boundary Component

import { Text } from "react-native";

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
      console.error("ErrorBoundary caught an error", error, errorInfo);
      setHasError(true);
    };

    const errorHandler = (error: Error, isFatal: boolean | undefined) => {
      handleError(error, {
        componentStack: isFatal ? "Fatal error" : "Non-fatal error",
      });
    };

    // Add global error handler
    const originalErrorHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler(errorHandler);

    return () => {
      // Restore original error handler on cleanup
      ErrorUtils.setGlobalHandler(originalErrorHandler);
    };
  }, []);

  if (hasError) {
    return <Text>Something went wrong.</Text>;
  }

  return <>{children}</>;
};

describe("Basic User Flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Authentication", () => {
    it("should handle login with valid credentials", async () => {
      // Mock successful authentication
      signInWithEmailAndPassword.mockResolvedValue({
        user: { uid: "test-uid", email: "test@example.com" },
      });

      const { getByPlaceholderText, getByTestId } = render(
        <ErrorBoundary>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </ErrorBoundary>
      );

      // Fill in login form
      fireEvent.changeText(getByPlaceholderText("Email"), "test@example.com");
      fireEvent.changeText(getByPlaceholderText("Password"), "password123");

      // Trigger login
      await act(async () => {
        fireEvent.press(getByTestId("login-button"));
      });

      // Verify login attempt
      await waitFor(() => {
        expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
          expect.any(Object), // The `auth` object
          "test@example.com",
          "password123"
        );
      });
    });

    it("should navigate to register screen", () => {
      const { getByTestId } = render(
        <ErrorBoundary>
          <AuthProvider>
            <Login />
          </AuthProvider>
        </ErrorBoundary>
      );

      fireEvent.press(getByTestId("register-link"));
      expect(require("expo-router").router.push).toHaveBeenCalledWith(
        "/(auth)/register"
      );
    });
  });
});
