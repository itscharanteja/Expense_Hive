import { jest } from '@jest/globals';
import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../../app/context/auth';
import Login from '../../app/(auth)/login';

// 1) Mock the modular signInWithEmailAndPassword function
jest.mock('firebase/auth', () => {
  const originalModule = jest.requireActual('firebase/auth');
  return {
    ...originalModule,
    signInWithEmailAndPassword: jest.fn(),
  };
});
import { signInWithEmailAndPassword } from 'firebase/auth';

// 2) Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
}));

describe('Basic User Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should handle login with valid credentials', async () => {
      // Mock successful authentication
      signInWithEmailAndPassword.mockResolvedValue({
        user: { uid: 'test-uid', email: 'test@example.com' },
      });

      const { getByPlaceholderText, getByTestId } = render(
        <AuthProvider>
          <Login />
        </AuthProvider>
      );

      // Fill in login form
      fireEvent.changeText(
        getByPlaceholderText('Email'),
        'test@example.com'
      );
      fireEvent.changeText(
        getByPlaceholderText('Password'),
        'password123'
      );

      // Trigger login
      await act(async () => {
        fireEvent.press(getByTestId('login-button'));
      });

      // Verify login attempt
      await waitFor(() => {
        expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
          expect.any(Object),  // The `auth` object
          'test@example.com',
          'password123'
        );
      });
    });

    it('should navigate to register screen', () => {
      const { getByTestId } = render(
        <AuthProvider>
          <Login />
        </AuthProvider>
      );

      fireEvent.press(getByTestId('register-link'));
      expect(require('expo-router').router.push).toHaveBeenCalledWith('/(auth)/register');
    });
  });
});