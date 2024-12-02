import { useEffect } from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "./context/auth";
import {
  registerForPushNotificationsAsync,
  addNotificationListener,
  addNotificationResponseListener,
  testLocalNotification,
  savePushToken,
} from "../services/NotificationService";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  useEffect(() => {
    async function setupNotifications() {
      try {
        console.log("Starting notification setup...");
        const token = await registerForPushNotificationsAsync();
        console.log("Notification setup complete. Token:", token);

        if (token) {
          await savePushToken(token);
        }

        // Test local notification
        // await testLocalNotification();

        // Listen for incoming notifications when app is in foreground
        const notificationListener = addNotificationListener(
          (notification: any) => {
            console.log("Received notification:", notification);
          }
        );

        // Listen for when user taps on notification
        const responseListener = addNotificationResponseListener(
          (response: any) => {
            console.log("Notification response:", response);
          }
        );

        return () => {
          notificationListener.remove();
          responseListener.remove();
        };
      } catch (error) {
        console.error("Error in notification setup:", error);
      }
    }

    setupNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(app)" options={{ headerShown: false }} />
          <Stack.Screen name="(group)" options={{ headerShown: false }} />
          <Stack.Screen name="add-expense" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
