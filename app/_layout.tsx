import { useEffect } from 'react';
import { Stack } from "expo-router";
import { AuthProvider } from "./context/auth";
import { registerForPushNotificationsAsync, addNotificationListener, addNotificationResponseListener } from '../services/NotificationService';

export default function RootLayout() {
  useEffect(() => {
    async function setupNotifications() {
      try {
        console.log('Starting notification setup...');
        const token = await registerForPushNotificationsAsync();
        console.log('Notification setup complete. Token:', token);

        // Listen for incoming notifications when app is in foreground
        const notificationListener = addNotificationListener((notification: any) => {
          console.log('Received notification:', notification);
        });

        // Listen for when user taps on notification
        const responseListener = addNotificationResponseListener((response: any) => {
          console.log('Notification response:', response);
        });

        return () => {
          notificationListener.remove();
          responseListener.remove();
        };
      } catch (error) {
        console.error('Error in notification setup:', error);
      }
    }

    setupNotifications();
  }, []);

  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
        <Stack.Screen name="(group)" options={{ headerShown: false }} />
        <Stack.Screen name="add-expense" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
