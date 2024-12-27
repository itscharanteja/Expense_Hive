import { useEffect } from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "./context/auth";
import {
  registerForPushNotificationsAsync,
  addNotificationListener,
  addNotificationResponseListener,
  savePushToken,
} from "../services/NotificationService";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  // useEffect(() => {
  //   async function setupNotifications() {
  //     try {
  //       console.log("Setting up notifications...");
  //       const token = await registerForPushNotificationsAsync();
  //       console.log("Got token:", token);

  //       if (token) {
  //         console.log("Saving token to Firestore...");
  //         await savePushToken(token);
  //         console.log("Token saved successfully");
  //       }

  //       const notificationListener = addNotificationListener(
  //         (notification: any) => {
  //           console.log("Received foreground notification:", notification);
  //         }
  //       );

  //       const responseListener = addNotificationResponseListener(
  //         (response: any) => {
  //           console.log("Notification response:", response);
  //         }
  //       );

  //       return () => {
  //         notificationListener.remove();
  //         responseListener.remove();
  //       };
  //     } catch (error) {
  //       console.error("Error in notification setup:", error);
  //     }
  //   }

  //   setupNotifications();
  // }, []);

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
