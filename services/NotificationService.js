import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import axios from "axios";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../app/config/firebase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Show alert in foreground
    shouldPlaySound: true, // Play sound for notifications
    shouldSetBadge: true, // Set badge count on app icon
  }),
});

export async function savePushToken(token) {
  if (!token) return false;

  try {
    const user = auth.currentUser;
    if (!user) return false;

    await updateDoc(doc(db, "users", user.uid), {
      expoPushToken: token,
      updatedAt: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error("Error saving push token:", error);
    return false;
  }
}

// Function to register for push notifications
export async function registerForPushNotificationsAsync() {
  let token;

  try {
    console.log("Registering for push notifications...");
    if (Device.isDevice) {
      // Check and request notification permissions
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Push notification permission denied.");
        return null;
      }

      // Get the Expo Push Token
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log("Expo Push Token:", token);
    } else {
      console.log("Must use a physical device for push notifications.");
    }

    // Set up Android notification channel
    if (Platform.OS === "android") {
      console.log("Setting up Android notification channel...");
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    return token;
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

// Function to handle responses to notifications
export function addNotificationResponseListener(callback) {
  const subscription =
    Notifications.addNotificationResponseReceivedListener(callback);
  return subscription;
}

// Function to send a push notification using Expo Push API
export async function sendPushNotification(to, title, body, data = {}) {
  try {
    const message = {
      to,
      sound: "default",
      title,
      body,
      data,
    };

    await axios.post("https://exp.host/--/api/v2/push/send", message, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    console.log("Push notification sent:", message);
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}

// Notification types for categorization
export const NotificationTypes = {
  REMINDER_DUE: "REMINDER_DUE",
  NEW_REMINDER: "NEW_REMINDER",
  GROUP_ADDITION: "GROUP_ADDITION",
  TASK_UPDATE: "TASK_UPDATE",
};

// Reminder notification: 30 minutes before the due time
export async function sendReminderDueNotification(to, reminderTitle) {
  await sendPushNotification(
    to,
    "Reminder Due Soon",
    `${reminderTitle} is due in 30 minutes`,
    { type: NotificationTypes.REMINDER_DUE }
  );
}

// New reminder notification
export async function sendNewReminderNotification(
  to,
  groupName,
  reminderTitle
) {
  await sendPushNotification(
    to,
    "New Reminder",
    `New reminder in ${groupName}: ${reminderTitle}`,
    { type: NotificationTypes.NEW_REMINDER }
  );
}

// Group addition notification
export async function sendGroupAdditionNotification(
  to,
  groupName,
  addedByUsername
) {
  await sendPushNotification(
    to,
    "Added to Group",
    `You were added to ${groupName} by ${addedByUsername}`,
    { type: NotificationTypes.GROUP_ADDITION }
  );
}

//New task notification
export async function sendNewTaskNotification(to, taskTitle) {
  await sendPushNotification(
    to,
    "New Task",
    `New task "${taskTitle}" has been assigned to you`,
    { type: NotificationTypes.TASK_UPDATE }
  );
}

// Task update notification
export async function sendTaskUpdateNotification(to, taskTitle, status) {
  await sendPushNotification(
    to,
    "Task Update",
    `Task "${taskTitle}" has been marked as ${status}`,
    { type: NotificationTypes.TASK_UPDATE }
  );
}
