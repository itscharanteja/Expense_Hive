import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

admin.initializeApp();

// Function to send push notification
async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data: any = {}
) {
  const message = {
    to: expoPushToken,
    sound: "default",
    title,
    body,
    data,
  };

  try {
    await axios.post("https://exp.host/--/api/v2/push/send", message, {
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error sending push notification:", error);
    throw error;
  }
}

// Trigger push notification when a new notification document is created
export const onNotificationCreated = functions.firestore.onDocumentCreated(
  "notifications/{notificationId}",
  async (event) => {
    console.log("Notification trigger started");
    const notification = event.data?.data();
    console.log("Notification data:", notification);

    if (!notification) {
      console.log("No notification data found");
      return;
    }

    if (notification.createdBy === notification.recipientEmail) {
      console.log("Skipping notification for creator");
      return;
    }

    const userRef = admin
      .firestore()
      .collection("users")
      .doc(notification.recipientId);
    console.log("Looking up user:", notification.recipientId);

    try {
      const userDoc = await userRef.get();
      const userData = userDoc.data();
      console.log("User data:", userData);

      if (userData?.expoPushToken) {
        console.log("Found push token:", userData.expoPushToken);

        const message = {
          to: userData.expoPushToken,
          sound: "default",
          title: "Added to Group",
          body: `You were added to ${notification.groupName} by ${notification.createdByUsername}`,
          data: notification,
          priority: "high",
        };

        console.log("Sending notification:", message);

        await axios.post("https://exp.host/--/api/v2/push/send", message, {
          headers: {
            Accept: "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
          },
        });

        console.log("Push notification sent successfully");
      } else {
        console.log("No push token found for user");
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error processing notification:", error.message);
      } else {
        console.error("Unknown error processing notification");
      }
    }
  }
);

export const cleanupReadNotifications = functions.scheduler.onSchedule(
  "every 5 minutes",
  async (_event: any) => {
    const fiveMinutesAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 5 * 60 * 1000)
    );

    const notificationsRef = admin.firestore().collection("notifications");
    const readNotificationsQuery = notificationsRef
      .where("read", "==", true)
      .where("readAt", "<=", fiveMinutesAgo);

    const snapshot = await readNotificationsQuery.get();

    const batch = admin.firestore().batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }
);
