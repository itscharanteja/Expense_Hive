import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { auth, db } from "../app/config/firebase";
import { updateDoc, doc } from "firebase/firestore";

// Configure how notifications should be presented when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Show alert even when app is in foreground
    shouldPlaySound: true, // Play sound for notifications
    shouldSetBadge: true, // Show badge count on app icon
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  try {
    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Permission not granted");
        return;
      }

      // Handle both Expo Go and Development build
      token = await Notifications.getExpoPushTokenAsync({
        projectId: "88a39d41-96fe-42f6-9aea-7c8b46745864", // For development build
        experienceId: "@itscharanteja/ExpHive", // For Expo Go
      });
      console.log("Push token:", token.data);
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    return token?.data;
  } catch (error) {
    console.error("Error in registerForPushNotificationsAsync:", error);
    return null;
  }
}

// Function to send a local notification (for testing)
export async function sendLocalNotification(title, body) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: title,
      body: body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null, // null means show immediately
  });
}

// Function to handle received notifications
export function addNotificationListener(callback) {
  const subscription = Notifications.addNotificationReceivedListener(callback);
  return subscription;
}

// Function to handle notifications when app is opened from a notification
export function addNotificationResponseListener(callback) {
  const subscription =
    Notifications.addNotificationResponseReceivedListener(callback);
  return subscription;
}

// Add this function to test notifications locally
export async function testLocalNotification() {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification",
        body: "This is a local test notification!",
        data: { data: "goes here" },
        sound: true,
      },
      trigger: null, // null means show immediately
    });
    console.log("Local notification scheduled successfully");
  } catch (error) {
    console.error("Error scheduling local notification:", error);
  }
}

// Add this function to save the push token
export async function savePushToken(token) {
  if (!token) return;

  try {
    const user = auth.currentUser;
    if (user) {
      console.log("Saving push token for user:", user.uid);
      console.log("Token:", token);
      await updateDoc(doc(db, "users", user.uid), {
        expoPushToken: token,
      });
      console.log("Push token saved successfully");
    }
  } catch (error) {
    console.error("Error saving push token:", error);
  }
}
