import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

admin.initializeApp();

export const cleanupReadNotifications = onSchedule(
  "every 5 minutes",
  async (event) => {
    try {
      const fiveMinutesAgo = admin.firestore.Timestamp.fromDate(
        new Date(Date.now() - 5 * 60 * 1000)
      );

      const notificationsRef = admin.firestore().collection("notifications");
      const readNotificationsQuery = notificationsRef
        .where("read", "==", true)
        .where("readAt", "<=", fiveMinutesAgo);

      const snapshot = await readNotificationsQuery.get();

      if (snapshot.empty) {
        console.log("No documents to delete");
        return;
      }

      const batch = admin.firestore().batch();
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      console.log(
        `Successfully deleted ${snapshot.docs.length} read notifications`
      );
    } catch (error) {
      console.error("Error cleaning up read notifications:", error);
      throw error;
    }
  }
);
