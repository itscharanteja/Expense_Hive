import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

admin.initializeApp();

export const cleanupReadNotifications = functions.pubsub
  .schedule("every 5 minutes")
  .onRun(async (context) => {
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

    console.log(`Cleaned up ${snapshot.docs.length} read notifications`);
    return null;
  });
