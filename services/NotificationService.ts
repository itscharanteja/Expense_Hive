import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { auth, db } from "../app/config/firebase";
import { updateDoc, doc } from "firebase/firestore";

// Define interface for notification handler response
interface NotificationHandlerResponse {
  shouldShowAlert: boolean;
  shouldPlaySound: boolean;
  shouldSetBadge: boolean;
}

// Configure notifications handler
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<NotificationHandlerResponse> => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(): Promise<
  string | undefined
> {
  let token: Notifications.ExpoPushToken | undefined;

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
    return undefined;
  }
}

export async function sendLocalNotification(
  title: string,
  body: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null,
  });
}

export function addNotificationListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export async function testLocalNotification(): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification",
        body: "This is a local test notification!",
        data: { data: "goes here" },
        sound: true,
      },
      trigger: null,
    });
    console.log("Local notification scheduled successfully");
  } catch (error) {
    console.error("Error scheduling local notification:", error);
  }
}

export async function savePushToken(token: string): Promise<void> {
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

export async function sendGroupAdditionNotification(
  groupName: string,
  addedByUsername: string
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Added to Group",
        body: `You were added to ${groupName} by ${addedByUsername}`,
        data: {
          type: "GROUP_ADDITION",
          groupName,
          addedByUsername,
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
    console.log("Group addition notification scheduled successfully");
  } catch (error) {
    console.error("Error scheduling group addition notification:", error);
  }
}

export async function testGroupNotification(): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Group Notification",
        body: "Test: You were added to Test Group by TestUser",
        data: {
          type: "GROUP_ADDITION",
          groupName: "Test Group",
          addedByUsername: "TestUser",
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null,
    });
    console.log("Test group notification sent successfully");
  } catch (error) {
    console.error("Error sending test group notification:", error);
  }
}
