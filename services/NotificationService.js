import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { auth, db } from "../app/config/firebase";
import { updateDoc, doc } from "firebase/firestore";
import axios from "axios";

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
    console.log("Starting push notification registration...");
    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      console.log("Current permission status:", existingStatus);
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        console.log("Requesting permission...");
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log("New permission status:", status);
      }

      if (finalStatus !== "granted") {
        console.log("Permission denied");
        return;
      }

      token = await Notifications.getExpoPushTokenAsync({
        projectId: "88a39d41-96fe-42f6-9aea-7c8b46745864",
      });
      console.log("Successfully got push token:", token.data);
    }

    if (Platform.OS === "android") {
      console.log("Setting up Android channel...");
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

// Add new notification types
export const NotificationTypes = {
  GROUP_ADDITION: "GROUP_ADDITION",
  REMINDER_DUE: "REMINDER_DUE",
  NEW_REMINDER: "NEW_REMINDER",
  TASK_UPDATE: "TASK_UPDATE",
};

// Unified notification sender
async function sendNotification(title, body, data = {}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
    console.log("Notification sent successfully:", { title, body });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
}

// Reminder notifications
// In services/NotificationService.js
export async function sendReminderDueNotification(
  reminderTitle,
  expoPushToken
) {
  try {
    if (expoPushToken) {
      const message = {
        to: expoPushToken,
        sound: "default",
        title: "Reminder Due Soon",
        body: `${reminderTitle} is due in 30 minutes`,
        data: { type: NotificationTypes.REMINDER_DUE },
      };

      await axios.post("https://exp.host/--/api/v2/push/send", message, {
        headers: {
          Accept: "application/json",
          "Accept-encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
      });
    }
  } catch (error) {
    console.error("Error sending reminder notification:", error);
  }
}
export async function sendNewReminderNotification(groupName, reminderTitle) {
  await sendNotification(
    "New Reminder",
    `New reminder in ${groupName}: ${reminderTitle}`,
    { type: NotificationTypes.NEW_REMINDER }
  );
}

// Group notifications
export async function sendGroupAdditionNotification(
  groupName,
  addedByUsername
) {
  await sendNotification(
    "Added to Group",
    `You were added to ${groupName} by ${addedByUsername}`,
    { type: NotificationTypes.GROUP_ADDITION }
  );
}

// Task notifications
export async function sendTaskUpdateNotification(taskTitle, status) {
  await sendNotification(
    "Task Update",
    `Task "${taskTitle}" has been marked as ${status}`,
    { type: NotificationTypes.TASK_UPDATE }
  );
}
