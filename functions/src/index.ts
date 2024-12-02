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
    const notification = event.data?.data();
    console.log("Processing notification:", notification);

    if (!notification) {
      console.log("No notification data");
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
        let title = "New Notification";
        let body = "";

        switch (notification.type) {
          case "GROUP_ADDITION":
            title = "Added to Group";
            body = `You were added to ${notification.groupName}`;
            break;
          // Add other cases as needed
        }

        await sendPushNotification(
          userData.expoPushToken,
          title,
          body,
          notification
        );
      } else {
        console.log("No push token found for user");
      }
    } catch (error) {
      console.error("Error processing notification:", error);
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
